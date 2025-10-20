import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { AuthGuard } from "../auth/auth.guard";
import { CreateBundleDto } from "./dto/create-bundle.dto";
import { CreatePresetBundleDto } from "./dto/create-preset-bundle.dto";
import { CreateServiceDto } from "./dto/create-service.dto";
import { DvmService } from "./dvm.service";

@Controller("dvm")
export class DvmController {
  constructor(private readonly dvmService: DvmService) {}

  // Service endpoints
  @Post("services")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createService(@Body() createServiceDto: CreateServiceDto) {
    return this.dvmService.createService(createServiceDto);
  }

  @Get("services")
  findAllServices() {
    return this.dvmService.findAllServices();
  }

  @Get("services/active")
  findActiveServices() {
    return this.dvmService.findActiveServices();
  }

  @Get("services/:id")
  findServiceById(@Param("id") id: string) {
    return this.dvmService.findServiceById(id);
  }

  @Patch("services/:id")
  @UseGuards(AdminGuard)
  updateService(
    @Param("id") id: string,
    @Body() updateData: Partial<CreateServiceDto>,
  ) {
    return this.dvmService.updateService(id, updateData);
  }

  @Patch("services/:id/deactivate")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateService(@Param("id") id: string) {
    return this.dvmService.deactivateService(id);
  }

  @Patch("services/:id/activate")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  activateService(@Param("id") id: string) {
    return this.dvmService.activateService(id);
  }

  // Bundle endpoints
  @Post("bundles")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createBundle(@Body() createBundleDto: CreateBundleDto) {
    return this.dvmService.createBundle(createBundleDto);
  }

  @Get("bundles")
  @UseGuards(AuthGuard)
  findAllBundles() {
    return this.dvmService.findAllBundles();
  }

  @Get("bundles/:id")
  @UseGuards(AuthGuard)
  findBundleById(@Param("id") id: string) {
    return this.dvmService.findBundleById(id);
  }

  @Patch("bundles/:id")
  @UseGuards(AdminGuard)
  updateBundle(
    @Param("id") id: string,
    @Body() updateData: Partial<CreateBundleDto>,
  ) {
    return this.dvmService.updateBundle(id, updateData);
  }

  @Delete("bundles/:id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteBundle(@Param("id") id: string) {
    return this.dvmService.deleteBundle(id);
  }

  // Preset Bundle endpoints
  @Post("preset-bundles")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createPresetBundle(@Body() createPresetBundleDto: CreatePresetBundleDto) {
    return this.dvmService.createPresetBundle(createPresetBundleDto);
  }

  @Get("preset-bundles")
  @UseGuards(AuthGuard)
  findAllPresetBundles() {
    return this.dvmService.findAllPresetBundles();
  }

  @Get("preset-bundles/:id")
  @UseGuards(AuthGuard)
  findPresetBundleById(@Param("id") id: string) {
    return this.dvmService.findPresetBundleById(id);
  }

  @Patch("preset-bundles/:id")
  @UseGuards(AdminGuard)
  updatePresetBundle(
    @Param("id") id: string,
    @Body() updateData: Partial<CreatePresetBundleDto>,
  ) {
    return this.dvmService.updatePresetBundle(id, updateData);
  }

  @Delete("preset-bundles/:id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePresetBundle(@Param("id") id: string) {
    return this.dvmService.deletePresetBundle(id);
  }
}
