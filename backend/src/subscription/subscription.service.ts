import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import {
  createApproveInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { Model, Types } from "mongoose";
import { BundleService } from "src/bundle/bundle.service";
import type { BundleDocument } from "src/bundle/schemas/bundle.schema";
import { PackageDocument } from "src/dvm/schemas/package.schema";
import { RequiredFormField } from "src/dvm/schemas/required-form-field.schema";
import {
  UserSubscription,
  UserSubscriptionDocument,
} from "src/subscription/schemas/user-subscription.schema";
import type { UserDocument } from "src/user/schemas/user.schema";
import {
  ClaimSubscriptionDto,
  ProvidedFormFieldDto,
} from "./dto/claim-subscription.dto";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { PrepareSubscriptionDto } from "./dto/prepare-subscription.dto";

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly PROGRAM_ID: string;
  private readonly MODE: string;
  private readonly USDC_MINT_ADDRESS =
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  private readonly SECONDS_PER_DAY = 86400;

  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly bundleService: BundleService,
    private readonly configService: ConfigService,
  ) {
    this.PROGRAM_ID = configService.get<string>("PROGRAM_ID")!;
    this.MODE = configService.get<string>("MODE")!;
  }

  async prepareSubscription(user: UserDocument, body: PrepareSubscriptionDto) {
    this.logger.log(
      `Entering prepareSubscription with user: ${user.walletAddress}, body: ${JSON.stringify(body)}`,
    );
    const bundle: BundleDocument =
      await this.bundleService.findActiveBundleByIdWithServiceDetails(
        body.bundleId,
      );

    if (!bundle) throw new NotFoundException("Bundle not found");
    this.logger.debug(`bundle found`);

    const filter = {
      user: Types.ObjectId.createFromHexString(user.id as string),
      bundle: Types.ObjectId.createFromHexString(body.bundleId),
    };

    // If subscription exists and is not cancelled or suspended, throw
    const existing = await this.userSubscriptionModel.findOne(filter).lean();
    if (
      existing &&
      existing.status !== "cancelled" &&
      existing.status !== "suspended"
    ) {
      throw new BadRequestException("Subscription already exists");
    }
    this.logger.debug(`subscription not found`);

    // Step 2: derive user subscription controller PDA
    const controllerAddress = this.getSubscriptionControllerAddress(
      user.walletAddress,
    );
    this.logger.debug(`controller address: ${controllerAddress}`);

    // If the controller PDA does not exist, build tx for FE to sign and send
    const controllerExists = await this.controllerPdaExists(controllerAddress);
    this.logger.debug(`controller exists: ${controllerExists}`);
    const transactions: {
      name: string;
      desc: string;
      instruction: TransactionInstruction;
    }[] = [];
    if (!controllerExists) {
      const initializeTxIx = await this.getInitializeControllerInstruction(
        controllerAddress,
        user.walletAddress,
      );
      transactions.push({
        name: "Initialize Controller",
        desc: "This is one time call to initialize your subscription controller. This controller will act as a gatekeeper to manage your subscriptions.",
        instruction: initializeTxIx,
      });
    }

    // Step 3: add approval transaction
    const approvalTxIx = await this.getApprovalInstruction(
      controllerAddress,
      user.walletAddress,
      Math.ceil(
        bundle.priceEveryInterval
          .slice(0, body.numberOfIntervals)
          .reduce((acc, curr) => acc + curr, 0) * 1e6,
      ), // convert to micro USDC
    );
    this.logger.verbose(
      `approval transaction instruction: ${JSON.stringify(approvalTxIx)}`,
    );
    transactions.push({
      name: "Allow controller to spend your funds",
      desc: "By approving this transaction, you allow the controller to spend your funds on your behalf every month. (It will only allow subscriptions that you have approved).",
      instruction: approvalTxIx,
    });

    return {
      transactions,
    };
  }

  async initiateSubscription(user: UserDocument, body: CreateSubscriptionDto) {
    this.logger.log(
      `Entering initiateSubscription with user: ${user.walletAddress}, body: ${JSON.stringify(body)}`,
    );
    const bundle: BundleDocument =
      await this.bundleService.findActiveBundleByIdWithServiceDetails(
        body.bundleId,
      );
    if (!bundle) throw new NotFoundException("Bundle not found");
    this.logger.debug(`bundle found`);

    const filter = {
      user: Types.ObjectId.createFromHexString(user.id as string),
      bundle: Types.ObjectId.createFromHexString(body.bundleId),
    };

    // If subscription exists and is not cancelled or suspended, throw
    const existing = await this.userSubscriptionModel.findOne(filter).lean();
    if (
      existing &&
      existing.status !== "cancelled" &&
      existing.status !== "intended" &&
      existing.status !== "suspended"
    ) {
      throw new BadRequestException("Subscription already exists");
    }
    this.logger.debug(`subscription not found`);

    // // Step 1: Create or re-activate as intended if previously cancelled/suspended
    const sub = await this.userSubscriptionModel.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          subscribeDate: new Date(),
        },
        $set: {
          status: "intended",
        },
      },
      { upsert: true, new: true },
    );

    // Step 2: Create Add Bundle Transaction
    const transactions: {
      name: string;
      desc: string;
      transaction: string;
    }[] = [];

    const privateKey = Uint8Array.from(
      JSON.parse(
        this.configService.get<string>("PRIVATE_KEY")!,
      ) as Iterable<number>,
    );
    const bundleTxIx = await this.getBundleInstruction(
      bundle,
      this.getSubscriptionControllerAddress(user.walletAddress),
      user.walletAddress,
      privateKey,
    );
    this.logger.verbose(
      `bundle transaction instruction: ${JSON.stringify(bundleTxIx)}`,
    );
    const bundleTx = await this.getBundleTransaction(
      bundleTxIx,
      privateKey,
      user.walletAddress,
    );
    transactions.push({
      name: "Add Bundle",
      desc: "This transaction adds the bundle to your subscription controller. By approving this transaction, you allow the subscription controller to spend your funds for this bundle.",
      transaction: bundleTx
        .serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        .toString("base64"),
    });

    return {
      subscription: sub,
      transactions,
    };
  }

  async findSubscriptionForFirstPayment(
    subscriptionId: string,
  ): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel.findById(subscriptionId).populate({
      path: "bundle",
      select:
        "name description color isPreset selectedPackages frequency totalFirstDiscountedPrice totalOriginalPrice priceEveryInterval isActive createdBy",
      populate: {
        path: "selectedPackages.service",
        select:
          "name logo category description allowedCustomerTypes isActive walletAddress emailAddress webhookUrl",
      },
    });
  }

  async findUserSubscriptions(
    userId: string,
  ): Promise<UserSubscriptionDocument[]> {
    return this.userSubscriptionModel
      .find({ user: Types.ObjectId.createFromHexString(userId) })
      .populate({
        path: "bundle",
        select:
          "name description color isPreset selectedPackages frequency totalFirstDiscountedPrice totalOriginalPrice priceEveryInterval isActive createdBy",
        populate: {
          path: "selectedPackages.service",
          select:
            "name logo category description allowedCustomerTypes isActive",
        },
      });
  }

  async findSubscriptionById(
    subscriptionId: string,
  ): Promise<UserSubscriptionDocument | null> {
    return this.userSubscriptionModel.findById(subscriptionId).populate([
      {
        path: "bundle",
        select:
          "name description color isPreset selectedPackages frequency totalFirstDiscountedPrice totalOriginalPrice priceEveryInterval isActive createdBy",
        populate: {
          path: "selectedPackages.service",
          select:
            "name logo category description allowedCustomerTypes isActive",
        },
      },
      "user",
    ]);
  }

  async claimSubscriptionPackage(
    claimSubscriptionDto: ClaimSubscriptionDto,
  ): Promise<UserSubscriptionDocument> {
    const subscription = (await this.findSubscriptionById(
      claimSubscriptionDto.subscription,
    ))!;
    if (subscription.status !== "active") {
      throw new BadRequestException("Subscription is not active");
    }

    if (
      subscription.claimedPackages.find(
        (claimedPackage) =>
          (claimedPackage.package as PackageDocument).id ===
          claimSubscriptionDto.package,
      )
    ) {
      throw new ConflictException("Package already claimed");
    }

    const packageToClaim = subscription.bundle.selectedPackages.find(
      (selectedPackage) =>
        (selectedPackage.package as PackageDocument).id ===
        claimSubscriptionDto.package,
    );
    if (!packageToClaim) {
      throw new NotFoundException("Package not found in subscription");
    }
    this.validateProvidedFormFields(
      claimSubscriptionDto.providedFormFields,
      packageToClaim.package.requiredFormFields,
    );
    subscription.claimedPackages.push({
      service: packageToClaim.service,
      package: packageToClaim.package,
      providedFormFields: claimSubscriptionDto.providedFormFields,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await subscription.save();

    return subscription;
  }

  private async getApprovalInstruction(
    controllerAddress: string,
    userWallet: string,
    amount: number,
  ): Promise<TransactionInstruction> {
    const controllerPda = new PublicKey(controllerAddress);
    const userPublicKey = new PublicKey(userWallet);
    const tokenAccount = await this.getTokenAccountAddress(
      userWallet,
      this.USDC_MINT_ADDRESS,
    );

    return createApproveInstruction(
      tokenAccount,
      controllerPda,
      userPublicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    );
  }

  private async getBundleInstruction(
    bundle: BundleDocument,
    controllerAddress: string,
    userWalletAddress: string,
    privateKey: Uint8Array,
  ): Promise<TransactionInstruction> {
    const programId = new PublicKey(this.PROGRAM_ID);
    const controllerPda = new PublicKey(controllerAddress);
    const walletKeyPair = Keypair.fromSecretKey(privateKey);
    const userWalletAddressPublicKey = new PublicKey(userWalletAddress);

    const maxPricePerInterval =
      bundle.priceEveryInterval[bundle.priceEveryInterval.length - 1];
    const interval =
      this.frequenceToDays(bundle.frequency) * this.SECONDS_PER_DAY;
    const recepients = await Promise.all(
      bundle.selectedPackages.map((selectedPackage) => {
        return this.getTokenAccountAddress(
          selectedPackage.service.walletAddress,
          this.USDC_MINT_ADDRESS,
        );
      }),
    );
    const numRecipients = bundle.selectedPackages.length;

    // Convert arguments to Buffers
    const amountBuf = Buffer.from(
      new BigUint64Array([BigInt(Math.ceil(maxPricePerInterval * 1e6))]).buffer, // convert to micro USDC
    );
    const intervalBuf = Buffer.from(
      new BigUint64Array([BigInt(interval)]).buffer,
    );
    const atasBuf = Buffer.concat(
      Array.from({ length: 5 }, (_, i) =>
        (recepients[i] || PublicKey.default).toBuffer(),
      ),
    );
    const numRecipientsBuf = Buffer.from([numRecipients]);
    const bundleIdBuf = createHash("md5")
      .update(bundle.id as string)
      .digest();

    // Anchor discriminator: sha256("global:initialize_controller").slice(0, 8)
    const discriminator = createHash("sha256")
      .update("global:add_bundle")
      .digest()
      .subarray(0, 8);

    // No args for initializeController in this context
    const data = Buffer.concat([
      discriminator,
      bundleIdBuf,
      amountBuf,
      intervalBuf,
      atasBuf,
      numRecipientsBuf,
    ]);

    const bundlePda = PublicKey.findProgramAddressSync(
      [bundleIdBuf, controllerPda.toBuffer()],
      new PublicKey(this.PROGRAM_ID),
    )[0];

    const keys = [
      { pubkey: controllerPda, isSigner: false, isWritable: true },
      { pubkey: bundlePda, isSigner: false, isWritable: true },
      { pubkey: walletKeyPair.publicKey, isSigner: true, isWritable: true }, // authority (same user)
      { pubkey: userWalletAddressPublicKey, isSigner: true, isWritable: true }, // user
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({ keys, programId, data });
  }

  private async getBundleTransaction(
    instruction: TransactionInstruction,
    privateKey: Uint8Array,
    userWalletAddress: string,
  ): Promise<Transaction> {
    const userWalletAddressPublicKey = new PublicKey(userWalletAddress);
    const walletKeyPair = Keypair.fromSecretKey(privateKey);
    const transaction = new Transaction({
      blockhash: (await this.getSolanaConnection().getLatestBlockhash())
        .blockhash,
      lastValidBlockHeight: (
        await this.getSolanaConnection().getLatestBlockhash()
      ).lastValidBlockHeight,
    }).add(instruction);
    transaction.feePayer = userWalletAddressPublicKey;
    transaction.partialSign(walletKeyPair);
    return transaction;
  }

  private getSubscriptionControllerAddress(userWallet: string): string {
    this.logger.log(
      `Entering getSubscriptionControllerAddress with userWallet: ${userWallet}`,
    );
    const programId = new PublicKey(this.PROGRAM_ID);
    const userPublicKey = new PublicKey(userWallet);
    const [controllerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("controller"), userPublicKey.toBuffer()],
      programId,
    );
    const controllerAddress = controllerPda.toBase58();
    this.logger.debug(
      `Exiting getSubscriptionControllerAddress with controller address: ${controllerAddress}`,
    );
    return controllerAddress;
  }

  private getSolanaConnection(): Connection {
    const mode = (this.MODE || "").toLowerCase();
    const isMainnet =
      mode === "mainnet" || mode === "production" || mode === "prod";
    const cluster = isMainnet ? "mainnet-beta" : "devnet";
    return new Connection(clusterApiUrl(cluster), "confirmed");
  }

  private async controllerPdaExists(
    controllerAddress: string,
  ): Promise<boolean> {
    try {
      const connection = this.getSolanaConnection();
      const pubkey = new PublicKey(controllerAddress);
      const info = await connection.getAccountInfo(pubkey);
      return info !== null;
    } catch (err) {
      this.logger.error(`Failed to check PDA existence: ${String(err)}`);
      return false;
    }
  }

  private async getTokenAccountAddress(
    userWallet: string,
    mintAccount: string,
  ): Promise<PublicKey> {
    const programId = TOKEN_PROGRAM_ID;
    const userPublicKey = new PublicKey(userWallet);
    const mintAccountPublicKey = new PublicKey(mintAccount);
    const tokenAccount = await getAssociatedTokenAddress(
      mintAccountPublicKey,
      userPublicKey,
      false,
      programId,
    );
    return tokenAccount;
  }

  private async getInitializeControllerInstruction(
    controllerAddress: string,
    authority: string,
  ): Promise<TransactionInstruction> {
    const programId = new PublicKey(this.PROGRAM_ID);

    // Anchor discriminator: sha256("global:initialize_controller").slice(0, 8)
    const discriminator = createHash("sha256")
      .update("global:initialize_controller")
      .digest()
      .subarray(0, 8);

    // No args for initializeController in this context
    const data = Buffer.from(discriminator);

    const controllerPda = new PublicKey(controllerAddress);
    const authorityPk = new PublicKey(authority);
    const usdcDevnetMint = new PublicKey(this.USDC_MINT_ADDRESS);
    const tokenAccount = await this.getTokenAccountAddress(
      authority,
      this.USDC_MINT_ADDRESS,
    );

    const keys = [
      { pubkey: controllerPda, isSigner: false, isWritable: true },
      { pubkey: usdcDevnetMint, isSigner: false, isWritable: false },
      { pubkey: authorityPk, isSigner: true, isWritable: false },
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({ keys, programId, data });
  }

  private frequenceToDays(frequency: string): number {
    switch (frequency) {
      case "annually":
        return 365;
      case "monthly":
        return 30;
      case "weekly":
        return 7;
      case "daily":
        return 1;
      default:
        return 0;
    }
  }

  private validateProvidedFormFields(
    providedFormFields: ProvidedFormFieldDto[],
    requiredFormFields: RequiredFormField[],
  ): void {
    for (const requiredFormField of requiredFormFields) {
      const providedFormField = providedFormFields.find(
        (providedFormField) =>
          providedFormField.fieldName === requiredFormField.fieldName,
      );
      if (!providedFormField) {
        throw new BadRequestException(
          `Expected form field "${requiredFormField.fieldName}" not provided`,
        );
      }
      if (
        (!providedFormField.fieldValue ||
          providedFormField.fieldValue === "") &&
        !requiredFormField.optional
      ) {
        throw new BadRequestException(
          `Non-optional form field "${requiredFormField.fieldName}" is given null value`,
        );
      }
      if (
        requiredFormField.fieldType == "number" &&
        providedFormField.fieldValue &&
        isNaN(Number(providedFormField.fieldValue))
      ) {
        throw new BadRequestException(
          `Form field "${requiredFormField.fieldName}" is given a non-number value`,
        );
      }
    }
  }
}
