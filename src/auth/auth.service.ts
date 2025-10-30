import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserDocument } from "src/user/schemas/user.schema";
import { UserService } from "src/user/user.service";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  generateToken(walletAddress: string): string {
    const payload = { walletAddress };
    return this.jwtService.sign(payload);
  }

  async validateUser(walletAddress: string): Promise<UserDocument> {
    // This method can be used to validate user from database if needed
    return this.userService.findByWalletAddress(walletAddress);
  }
}
