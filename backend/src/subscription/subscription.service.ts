import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { Model, Types } from "mongoose";
import { BundleService } from "src/bundle/bundle.service";
import type { Bundle } from "src/bundle/schemas/bundle.schema";
import {
  UserSubscription,
  UserSubscriptionDocument,
} from "src/subscription/schemas/user-subscription.schema";
import type { UserDocument } from "src/user/schemas/user.schema";

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly PROGRAM_ID: string;
  private readonly MODE: string;
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly bundleService: BundleService,
    configService: ConfigService,
  ) {
    this.PROGRAM_ID = configService.get<string>("PROGRAM_ID")!;
    this.MODE = configService.get<string>("MODE")!;
  }

  async initiateSubscription(bundleId: string, user: UserDocument) {
    const bundle: Bundle =
      await this.bundleService.findActiveBundleById(bundleId);
    if (!bundle) throw new NotFoundException("Bundle not found");

    const filter = {
      user: Types.ObjectId.createFromHexString(user.id as string),
      bundle: Types.ObjectId.createFromHexString(bundleId),
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

    // // Step 1: Create or re-activate as intended if previously cancelled/suspended
    // const sub = await this.userSubscriptionModel.findOneAndUpdate(
    //   filter,
    //   {
    //     $setOnInsert: {
    //       subscribeDate: new Date(),
    //     },
    //     $set: {
    //       status: "intended",
    //     },
    //   },
    //   { upsert: true, new: true },
    // );

    // Step 2: derive user subscription controller PDA
    const controllerAddress = this.getSubscriptionControllerAddress(
      user.walletAddress,
    );

    // If the controller PDA does not exist, build tx for FE to sign and send
    const controllerExists = await this.controllerPdaExists(controllerAddress);
    const transactions: { type: string; data: unknown }[] = [];
    if (!controllerExists) {
      const initializeTxIx = await this.getInitializeControllerInstruction(
        controllerAddress,
        user.walletAddress,
      );
      transactions.push({
        type: "initializeController",
        data: { transaction: initializeTxIx },
      });
    }

    return {
      // subscriptionId: sub.id as string,
      controllerAddress,
      transactions,
    };
  }

  private getSubscriptionControllerAddress(userWallet: string): string {
    const programId = new PublicKey(this.PROGRAM_ID);
    const userPublicKey = new PublicKey(userWallet);
    const [controllerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("controller"), userPublicKey.toBuffer()],
      programId,
    );
    return controllerPda.toBase58();
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
    const usdcDevnetMint = new PublicKey(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    );
    const tokenAccount = await this.getTokenAccountAddress(
      authority,
      usdcDevnetMint.toBase58(),
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

  private buildSubscriptionTransactionsStub(
    _controllerAddress: string,
    _bundleId: string,
    _userWallet: string,
  ): { type: string; data: unknown }[] {
    // Placeholder: return mock tx payloads
    void _controllerAddress;
    void _bundleId;
    void _userWallet;
    return [
      { type: "subscription", data: { raw: "0xsub-tx" } },
      { type: "approval", data: { raw: "0xapprove-tx" } },
    ];
  }
}
