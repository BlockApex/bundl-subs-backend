import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateServiceDto } from "./dto/create-service.dto";
import { Service, ServiceDocument } from "./schemas/service.schema";

@Injectable()
export class DvmService {
  private readonly logger = new Logger(DvmService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  // Service CRUD operations
  async createService(
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceDocument> {
    try {
      const service = new this.serviceModel(createServiceDto);
      return await service.save();
    } catch (error) {
      this.logger.error("Error creating service:", error);
      throw new BadRequestException("Failed to create service");
    }
  }

  async findAllServices(): Promise<ServiceDocument[]> {
    return this.serviceModel.find().exec();
  }

  async findActiveServices(): Promise<ServiceDocument[]> {
    return this.serviceModel.find({ isActive: true }).exec();
  }

  async findServiceRootDocumentsByIds(
    ids: string[],
  ): Promise<ServiceDocument[]> {
    const services = await this.serviceModel
      .find({ _id: { $in: ids } }, { packages: 0 })
      .exec();
    if (services.length !== ids.length) {
      throw new NotFoundException("One or more services not found");
    }
    return services;
  }

  async findServiceById(id: string): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    return service;
  }

  async updateService(
    id: string,
    updateData: Partial<CreateServiceDto>,
  ): Promise<ServiceDocument> {
    const service = await this.serviceModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    return service;
  }

  async deactivateService(id: string): Promise<void> {
    const service = await this.serviceModel
      .findByIdAndUpdate(id, { isActive: false })
      .exec();
    if (!service) {
      throw new NotFoundException("Service not found");
    }
  }

  async activateService(id: string): Promise<void> {
    const service = await this.serviceModel
      .findByIdAndUpdate(id, { isActive: true })
      .exec();
    if (!service) {
      throw new NotFoundException("Service not found");
    }
  }
}
