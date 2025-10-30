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
import { AdminGuard } from "../auth/admin.guard";
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
}
