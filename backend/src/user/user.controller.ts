import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { User } from "./schemas/user.schema";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ walletAddress: string; token: string }> {
    return this.userService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: User) {
    return {
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      message: "This is a protected route",
    };
  }

  @Get("admin")
  @UseGuards(AdminGuard)
  getAdminPanel(@CurrentUser() user: User) {
    return {
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      message: "Welcome to the admin panel",
      adminFeatures: [
        "User management",
        "System configuration",
        "Analytics dashboard",
      ],
    };
  }
}
