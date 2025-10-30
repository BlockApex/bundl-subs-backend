import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "src/auth/admin.guard";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { UserDocument } from "src/user/schemas/user.schema";
import { BundleService } from "./bundle.service";
import { BundlePreviewRequestDto } from "./dto/bundle-preview-request.dto";
import { BundlePreviewResponseDto } from "./dto/bundle-preview-response.dto";
import {
  CreateBundleDto,
  CreatePresetBundleDto,
} from "./dto/create-bundle.dto";
import { UserBundleGuard } from "./user-bundle.guard";

@Controller("bundle")
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  @Post("preview")
  @HttpCode(HttpStatus.OK)
  async previewBundle(
    @Body() request: BundlePreviewRequestDto,
  ): Promise<BundlePreviewResponseDto> {
    return this.bundleService.previewBundle(request);
  }

  // Bundle endpoints
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createBundle(
    @Body() createBundleDto: CreateBundleDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.bundleService.createBundle(createBundleDto, user);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAllBundles(@CurrentUser() user: UserDocument) {
    return this.bundleService.findAllBundles(user);
  }

  @Patch(":id")
  @UseGuards(UserBundleGuard)
  updateBundle(
    @Param("id") id: string,
    @Body() updateData: Partial<CreateBundleDto>,
  ) {
    return this.bundleService.updateBundle(id, updateData);
  }

  @Patch(":id/deactivate")
  @UseGuards(UserBundleGuard)
  @HttpCode(HttpStatus.OK)
  deactivateBundle(@Param("id") id: string) {
    return this.bundleService.deactivateBundle(id);
  }

  @Patch(":id/reactivate")
  @UseGuards(UserBundleGuard)
  @HttpCode(HttpStatus.OK)
  reactivateBundle(@Param("id") id: string) {
    return this.bundleService.reactivateBundle(id);
  }

  // Preset Bundle endpoints
  @Post("preset")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createPresetBundle(
    @Body() createPresetBundleDto: CreatePresetBundleDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.bundleService.createPresetBundle(createPresetBundleDto, user);
  }

  @Get("preset")
  findAllPresetBundles() {
    return this.bundleService.findAllPresetBundles();
  }

  // this should be kept below the preset bundle endpoints to avoid conflicts
  @Get(":id")
  findActiveBundleById(@Param("id") id: string) {
    return this.bundleService.findActiveBundleById(id);
  }
}
