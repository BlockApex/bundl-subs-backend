import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { createHash } from "crypto";
import { BundleService } from "src/bundle/bundle.service";
import type { BundleDocument } from "src/bundle/schemas/bundle.schema";
import { UserSubscriptionDocument } from "src/subscription/schemas/user-subscription.schema";
import { SubscriptionService } from "src/subscription/subscription.service";
import type { UserDocument } from "src/user/schemas/user.schema";
import { TriggerPaymentDto } from "./dto/trigger-payment.dto";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly PROGRAM_ID: string;
  private readonly MODE: string;
  private readonly USDC_MINT_ADDRESS =
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  private readonly SECONDS_PER_DAY = 86400;
  private readonly connection: Connection;

  constructor(
    private readonly bundleService: BundleService,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {
    this.PROGRAM_ID = configService.get<string>("PROGRAM_ID")!;
    this.MODE = configService.get<string>("MODE")!;
    this.connection = this.getSolanaConnection();
  }

  async triggerSubscriptionFirstPayment(
    user: UserDocument,
    payload: TriggerPaymentDto,
  ) {
    const subscription =
      await this.subscriptionService.findSubscriptionForFirstPayment(
        payload.subscriptionId,
      );
    if (!subscription) throw new NotFoundException("Subscription not found");
    if (subscription.status !== "intended") {
      throw new BadRequestException(
        "This subscription's first payment has already been made",
      );
    }

    const bundle = subscription.bundle as BundleDocument;

    const userUSDCAccount = await this.getTokenAccountAddress(
      user.walletAddress,
      this.USDC_MINT_ADDRESS,
    );

    // verify on-chain that sub is added and approval exists
    await this.ensurePDAsExistsAndHasApproval(
      user.walletAddress,
      userUSDCAccount,
      bundle.totalFirstDiscountedPrice,
      bundle.id as string,
    );

    // Create invoice for this payment attempt
    const invoice = {
      date: new Date(),
      status: "pending" as const,
      amount: bundle.totalFirstDiscountedPrice,
      paymentHistory: [],
    };

    subscription.invoices.push(invoice);
    await subscription.save();

    // Stub: trigger pull payment
    const privateKey = Uint8Array.from(
      JSON.parse(
        this.configService.get<string>("PRIVATE_KEY")!,
      ) as Iterable<number>,
    );
    const triggerInstruction = await this.getTriggerInstruction(
      bundle,
      user.walletAddress,
      userUSDCAccount,
      privateKey,
    );
    const triggerTransaction = await this.getTriggerTransaction(
      triggerInstruction,
      privateKey,
    );
    this.logger.verbose(
      `triggerTransaction: ${JSON.stringify(triggerTransaction)}`,
    );
    this.logger.verbose(
      `triggerTransaction signatures: ${JSON.stringify(triggerTransaction.signatures)}`,
    );
    let signature: TransactionSignature;
    try {
      signature = await this.connection.sendTransaction(triggerTransaction);
    } catch (err) {
      this.logger.error(`Transaction failed: ${JSON.stringify(err)}`);
      const logs = await (err as SendTransactionError).getLogs(this.connection);
      this.logger.error(`Transaction logs: ${JSON.stringify(logs)}`);
      await this.updatePaymentStatus(false, subscription, undefined);
      throw err;
    }
    this.logger.verbose(`Transaction signature fetched: ${signature}`);
    const result = await this.connection.confirmTransaction(
      {
        signature,
        blockhash: (await this.connection.getLatestBlockhash()).blockhash,
        lastValidBlockHeight: (await this.connection.getLatestBlockhash())
          .lastValidBlockHeight,
      },
      "confirmed",
    );
    if (result.value.err) {
      this.logger.error(
        `Transaction not found or did not succeed: ${JSON.stringify(result)}`,
      );
      await this.updatePaymentStatus(false, subscription, undefined);
      throw new Error("Transaction not found or did not succeed");
    }
    const txHash = signature;

    // Update invoice status
    await this.updatePaymentStatus(true, subscription, txHash);
    // Update next payment date
    await this.updateNextPaymentDate(subscription);

    return { subscription, txHash };
  }

  private getSolanaConnection(): Connection {
    const mode = (this.MODE || "").toLowerCase();
    const isMainnet =
      mode === "mainnet" || mode === "production" || mode === "prod";
    const cluster = isMainnet ? "mainnet-beta" : "devnet";
    return new Connection(clusterApiUrl(cluster), "confirmed");
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

  private async ensurePDAsExistsAndHasApproval(
    userWallet: string,
    userTokenAddress: PublicKey,
    amount: number,
    bundleId: string,
  ): Promise<void> {
    this.logger.log(
      `Entering ensureControllerPDAExistsAndHasApproval with userWallet: ${userWallet}, userTokenAddress: ${userTokenAddress.toBase58()}, amount: ${amount}`,
    );
    const usdcBalance =
      await this.connection.getTokenAccountBalance(userTokenAddress);
    if ((usdcBalance.value.uiAmount ?? 0) < amount) {
      throw new BadRequestException(
        `Insufficient USDC balance, you have ${usdcBalance.value.uiAmount ?? 0} USDC but need ${amount} USDC`,
      );
    }

    const controllerAddress = this.getSubscriptionControllerAddress(userWallet);
    const controllerPda = new PublicKey(controllerAddress);
    const info = await this.connection.getAccountInfo(controllerPda);
    if (!info) {
      throw new BadRequestException(
        `Controller PDA not found for user ${userWallet}`,
      );
    }
    this.logger.debug(`Controller PDA found for user ${JSON.stringify(info)}`);
    const tokenAccountInfo = await getAccount(
      this.connection,
      userTokenAddress,
    );
    if (!tokenAccountInfo) {
      throw new BadRequestException(
        `User token account not found for user ${userWallet}`,
      );
    }
    this.logger.debug(
      `User token account found for user ${JSON.stringify(tokenAccountInfo)}`,
    );
    if (
      tokenAccountInfo.delegate == null ||
      tokenAccountInfo.delegate.toBase58() !== controllerAddress
    ) {
      throw new BadRequestException(
        `Subscription controller is not approved by user account. Controller Address: ${controllerAddress}`,
      );
    }
    this.logger.debug(
      `Subscription controller is approved by user account. Delegated Amount: ${tokenAccountInfo.delegatedAmount}`,
    );
    if (tokenAccountInfo.delegatedAmount < BigInt(amount * 1e6)) {
      throw new BadRequestException(
        `Insufficient delegated amount, you have ${tokenAccountInfo.delegatedAmount} but need ${BigInt(amount * 1e6)}`,
      );
    }
    this.logger.debug(`Delegated amount is sufficient.`);
    const bundleIdBuf = createHash("md5").update(bundleId).digest();
    const [bundlePda] = PublicKey.findProgramAddressSync(
      [bundleIdBuf, controllerPda.toBuffer()],
      new PublicKey(this.PROGRAM_ID),
    );
    const bundleInfo = await this.connection.getAccountInfo(bundlePda);
    if (!bundleInfo) {
      throw new BadRequestException(
        `Bundle PDA not found for user ${userWallet}`,
      );
    }
  }

  private async getTriggerInstruction(
    bundle: BundleDocument,
    userWalletAddress: string,
    userTokenAddress: PublicKey,
    privateKey: Uint8Array,
  ): Promise<TransactionInstruction> {
    const programId = new PublicKey(this.PROGRAM_ID);
    const bundleIdBuf = createHash("md5")
      .update(bundle.id as string)
      .digest();
    const splittedAmounts = bundle.selectedPackages.map((packageDetail) => {
      return this.bundleService.calculateDiscountedPrice(
        packageDetail.package.amount,
        packageDetail.applicableOffers,
        0,
        bundle.frequency,
      );
    });

    const controllerPda = new PublicKey(
      this.getSubscriptionControllerAddress(userWalletAddress),
    );
    const bundlePda = PublicKey.findProgramAddressSync(
      [bundleIdBuf, controllerPda.toBuffer()],
      new PublicKey(this.PROGRAM_ID),
    )[0];
    const userWalletAddressPublicKey = new PublicKey(userWalletAddress);
    const walletKeyPair = Keypair.fromSecretKey(privateKey);
    const authority = walletKeyPair.publicKey;

    const recepients = await Promise.all(
      bundle.selectedPackages.map((selectedPackage) => {
        return this.getTokenAccountAddress(
          selectedPackage.service.walletAddress,
          this.USDC_MINT_ADDRESS,
        );
      }),
    );

    // Convert arguments to Buffers
    const amountsBuf = Buffer.concat(
      Array.from({ length: 5 }, (_, i) =>
        Buffer.from(
          new BigUint64Array([
            BigInt(Math.ceil((splittedAmounts[i] ?? 0) * 1e6)),
          ]).buffer,
        ),
      ),
    );

    const discriminator = createHash("sha256")
      .update("global:trigger")
      .digest()
      .subarray(0, 8);

    // No args for initializeController in this context
    const data = Buffer.concat([discriminator, bundleIdBuf, amountsBuf]);

    const keys = [
      { pubkey: controllerPda, isSigner: false, isWritable: true },
      { pubkey: bundlePda, isSigner: false, isWritable: true },
      { pubkey: userTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userWalletAddressPublicKey, isSigner: false, isWritable: true },
      {
        pubkey: new PublicKey(this.USDC_MINT_ADDRESS),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: authority, isSigner: true, isWritable: true }, // authority (server)
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
      ...recepients.map((recipient) => ({
        pubkey: recipient,
        isSigner: false,
        isWritable: true,
      })),
    ];

    return new TransactionInstruction({ keys, programId, data });
  }

  private async getTriggerTransaction(
    instruction: TransactionInstruction,
    privateKey: Uint8Array,
  ): Promise<VersionedTransaction> {
    const walletKeyPair = Keypair.fromSecretKey(privateKey);
    const transaction = new Transaction({
      blockhash: (await this.getSolanaConnection().getLatestBlockhash())
        .blockhash,
      lastValidBlockHeight: (
        await this.getSolanaConnection().getLatestBlockhash()
      ).lastValidBlockHeight,
    }).add(instruction);
    transaction.feePayer = walletKeyPair.publicKey;
    transaction.sign(walletKeyPair);
    const message = transaction.compileMessage();
    const versionedTransaction = new VersionedTransaction(message);
    versionedTransaction.sign([walletKeyPair]);
    return versionedTransaction;
  }

  private async updatePaymentStatus(
    success: boolean,
    subscription: UserSubscriptionDocument,
    txHash?: string,
  ) {
    const lastInvoice = subscription.invoices[subscription.invoices.length - 1];
    lastInvoice.status = success ? "paid" : "failed";
    lastInvoice.paymentHistory.push({
      time: new Date(),
      status: success ? "success" : "failed",
      txHash,
    });
    subscription.status = success ? "active" : "intended";
    await subscription.save();
  }

  private async updateNextPaymentDate(subscription: UserSubscriptionDocument) {
    const nextPaymentDate =
      Date.now() +
      this.frequenceToDays(subscription.bundle.frequency) *
        this.SECONDS_PER_DAY *
        1000;
    subscription.nextPaymentDate = new Date(nextPaymentDate);
    await subscription.save();
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
}
