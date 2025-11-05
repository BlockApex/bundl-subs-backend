import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import express from "express";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard } from "../auth/auth.guard";
import { LoginDto } from "./dto/login.dto";
import { UpdateKycInfoDto } from "./dto/update-kyc-info.dto";
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

  @Get("kyc-info")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  getKycInfo(@CurrentUser() user: UserDocument) {
    return { kycInfo: user.kycInfo ?? {} };
  }

  @Put("kyc-info")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateKycInfo(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateKycInfoDto,
  ) {
    const kycInfo = await this.userService.updateKycInfo(
      user.id as string,
      dto.kycInfo,
    );
    return { kycInfo };
  }

  @Post("upload-image")
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 1 * 1024 * 1024 },
      fileFilter: (
        req: express.Request,
        file: { mimetype: string },
        cb: (err: Error | null, acceptFile: boolean) => void,
      ) => {
        const mime = (file.mimetype || "").toLowerCase();
        if (
          mime === "image/jpeg" ||
          mime === "image/png" ||
          mime === "image/webp" ||
          mime === "image/gif"
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only image files are allowed"), false);
        }
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadImage(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const url = await this.userService.uploadImage(file);
    return { url };
  }

  @Get("profile-stats")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfileStats(@CurrentUser() user: UserDocument) {
    return this.userService.getProfileStats(user.id as string);
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
