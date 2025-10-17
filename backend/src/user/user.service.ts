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
import { Model } from "mongoose";
import { sign } from "tweetnacl";
import { AuthService } from "../auth/auth.service";
import { LoginDto } from "./dto/login.dto";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private authService: AuthService,
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

  private getVerificationMessage(): string {
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

  async findByWalletAddress(walletAddress: string): Promise<User> {
    const user = await this.userModel.findOne({ walletAddress });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}
