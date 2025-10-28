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
import { Model, Types } from "mongoose";
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
}
