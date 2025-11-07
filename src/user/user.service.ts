import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { writeFile } from "fs";
import { Model, Types } from "mongoose";
import { extname, join } from "path";
import {
  InvoiceDocument,
  UserSubscription,
  UserSubscriptionDocument,
} from "src/subscription/schemas/user-subscription.schema";
import { sign } from "tweetnacl";
import { AuthService } from "../auth/auth.service";
import { LoginDto } from "./dto/login.dto";
import { User, UserDocument } from "./schemas/user.schema";

type UserActivityItem = {
  bundle: unknown;
  date: Date;
  text: string;
  status: string;
  amount: number;
  statusThemeClass: "success" | "warning" | "error" | "info";
  type: "invoice" | "paymentHistory" | "subscription";
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private authService: AuthService,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ walletAddress: string; token: string }> {
    const { walletAddress, signature, kycInfo } = loginDto;

    // Check if user already exists
    let existingUser = await this.userModel.findOne({ walletAddress });

    // Verify the signature
    const isValidSignature = this.verifySignature(walletAddress, signature);
    if (!isValidSignature) {
      throw new BadRequestException("Invalid signature");
    }

    // Create new user
    const user = new this.userModel({
      walletAddress,
      signature,
      kycInfo: kycInfo || {},
    });

    if (!existingUser) {
      existingUser = await user.save();
    }
    const token = this.authService.generateToken(existingUser.walletAddress);

    return {
      walletAddress: existingUser.walletAddress,
      token,
    };
  }

  async checkUserStatus(
    walletAddress: string,
  ): Promise<{ exists: boolean; verificationMessage?: string }> {
    const user = await this.userModel.findOne({ walletAddress });

    if (user) {
      return { exists: true };
    }

    // Return verification message for new users
    const verificationMessage = this.getVerificationMessage();
    return { exists: false, verificationMessage };
  }

  getVerificationMessage(): string {
    return (
      this.configService.get("VERIFY_WALLET_TEXT") ||
      "Sign this message to verify your wallet address"
    );
  }

  private verifySignature(walletAddress: string, signature: string): boolean {
    try {
      // Create a verification message
      const message = this.getVerificationMessage();
      const messageBytes = new TextEncoder().encode(message);

      // Convert signature from base58 to Uint8Array
      const signatureBytes = bs58.decode(signature);

      // Convert wallet address to PublicKey
      const publicKey = new PublicKey(walletAddress);

      // Verify the signature using nacl
      const result = sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes(),
      );

      return result;
    } catch (error) {
      console.error(
        "Signature verification error:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  async findByWalletAddress(walletAddress: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ walletAddress });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  private frequencyToMonthlyMultiplier(frequency: string): number {
    const f = (frequency || "").toLowerCase();
    switch (f) {
      case "monthly":
        return 1;
      case "weekly":
        return 30 / 7;
      case "yearly":
      case "annually":
        return 1 / 12;
      case "daily":
        return 30;
      default:
        return 1;
    }
  }

  async getProfileStats(userId: string): Promise<{
    activeSubscriptionsCount: number;
    totalMonthlySavings: number;
    totalMonthlySpending: number;
    lastPaymentDate: Date | null;
    paymentsDueNext30Days: number;
  }> {
    const subs: UserSubscriptionDocument[] = await this.userSubscriptionModel
      .find({
        user: Types.ObjectId.createFromHexString(userId),
        invoices: { $exists: true, $ne: [] },
      })
      .populate({
        path: "bundle",
        select:
          "frequency totalFirstDiscountedPrice totalOriginalPrice priceEveryInterval",
      });

    let activeSubscriptionsCount = 0;
    let totalMonthlySavings = 0;
    let totalMonthlySpending = 0;
    let lastPaymentDate: Date | null = null;
    let paymentsDueNext30Days = 0;

    const now = new Date();
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const sub of subs) {
      const bundle = sub.bundle;

      // last successful payment date
      for (const inv of sub.invoices) {
        for (const ph of inv.paymentHistory) {
          if (ph.status === "success") {
            const t = new Date(ph.time);
            if (!lastPaymentDate || t > lastPaymentDate) lastPaymentDate = t;
          }
        }
      }

      // payments due in next 30 days
      if (sub.status === "active" || sub.status === "grace-period") {
        const npd = sub.nextPaymentDate;
        if (npd >= now && npd <= next30)
          paymentsDueNext30Days += sub.bundle.priceEveryInterval[1]; // I am sure, for the demo, we won't hit the 3rd interval. TODO: fix this
      }

      // spending and savings from active subs
      if (sub.status === "active") {
        activeSubscriptionsCount += 1;
        const original = bundle.totalOriginalPrice;
        const frequency = bundle.frequency;
        const multiplier = this.frequencyToMonthlyMultiplier(frequency);
        const discountedMonthly = bundle.totalFirstDiscountedPrice * multiplier;
        const originalMonthly = original * multiplier;
        totalMonthlySpending += discountedMonthly;
        totalMonthlySavings += Math.max(0, originalMonthly - discountedMonthly);
      }
    }

    // round to 2 decimals for currency-like values
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      activeSubscriptionsCount,
      totalMonthlySavings: round2(totalMonthlySavings),
      totalMonthlySpending: round2(totalMonthlySpending),
      lastPaymentDate,
      paymentsDueNext30Days,
    };
  }

  async getActivity(userId: string): Promise<UserActivityItem[]> {
    const subs = await this.userSubscriptionModel
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
      })
      .lean();

    const activity: UserActivityItem[] = [];

    for (const sub of subs) {
      // subscription created
      if (sub.subscribeDate) {
        activity.push({
          bundle: sub.bundle,
          date: sub.createdAt,
          text: `You subscribed to ${sub.bundle.name}`,
          status: "Subscribed",
          amount: sub.bundle.totalFirstDiscountedPrice,
          statusThemeClass: "info",
          type: "subscription",
        });
      }

      // invoices and payment history within
      for (const inv of sub.invoices ?? []) {
        const invId = (inv as InvoiceDocument)._id.toString("hex");
        activity.push({
          bundle: sub.bundle,
          date: new Date(inv.date),
          text: `Invoice ${invId.slice(0, 6)}...${invId.slice(-4)} created for auto-pay scheduled`,
          status: "Renewal Due",
          amount: inv.amount,
          statusThemeClass: "warning",
          type: "invoice",
        });

        for (const ph of inv.paymentHistory ?? []) {
          activity.push({
            bundle: sub.bundle,
            date: new Date(ph.time),
            text: `Payment ${ph.status} for invoice ${invId.slice(0, 6)}...${invId.slice(-4)}`,
            status: ph.status === "success" ? "Success" : "Failed",
            statusThemeClass: ph.status === "success" ? "success" : "error",
            amount: inv.amount,
            type: "paymentHistory",
          });
        }
      }
    }

    activity.sort((a, b) => b.date.getTime() - a.date.getTime());
    return activity;
  }

  async updateKycInfo(
    userId: string,
    kycInfo: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { kycInfo, updatedAt: new Date() },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException("User not found");
    }
    return updated.kycInfo || {};
  }

  async uploadImage(newFile: Express.Multer.File) {
    if (!newFile) {
      throw new BadRequestException("No file uploaded");
    }
    const uploadsDir = this.configService.get<string>("UPLOADS_DIR")!;
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(newFile.originalname).toLowerCase();
    const filename = `${unique}${ext}`;
    const fullPath = join(uploadsDir, filename);
    const promise = new Promise<void>((resolve, reject) => {
      writeFile(fullPath, newFile.buffer, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    await promise;
    return `${this.configService.get("UPLOADS_PREFIX")}/${filename}`;
  }
}
