import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import express from "express";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard } from "../auth/auth.guard";
import { LoginDto } from "./dto/login.dto";
import type { UserDocument } from "./schemas/user.schema";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: express.Response,
  ): Promise<{ walletAddress: string; token: string }> {
    const { walletAddress, token } = await this.userService.login(loginDto);
    response.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return { walletAddress, token };
  }

  @Get("verification-message")
  getVerificationMessage(): { message: string } {
    return { message: this.userService.getVerificationMessage() };
  }

  @Get("profile")
  @UseGuards(AuthGuard)
  getProfile(@CurrentUser() user: UserDocument) {
    return {
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin,
      message: "This is a protected route",
    };
  }

  @Get("activity")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getActivity(@CurrentUser() user: UserDocument) {
    return this.userService.getActivity(user.id as string);
  }

  @Get("admin")
  @UseGuards(AdminGuard)
  getAdminPanel(@CurrentUser() user: UserDocument) {
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
