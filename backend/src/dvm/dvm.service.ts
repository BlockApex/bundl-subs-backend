import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  CreateBundleDto,
  CreatePresetBundleDto,
} from "./dto/create-bundle.dto";
import { CreateServiceDto } from "./dto/create-service.dto";
import { Bundle, BundleDocument } from "./schemas/bundle.schema";
import { Service, ServiceDocument } from "./schemas/service.schema";

@Injectable()
export class DvmService {
  private readonly logger = new Logger(DvmService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Bundle.name) private bundleModel: Model<BundleDocument>,
  ) {}

  // Service CRUD operations
  async createService(createServiceDto: CreateServiceDto): Promise<Service> {
    try {
      const service = new this.serviceModel(createServiceDto);
      return await service.save();
    } catch (error) {
      this.logger.error("Error creating service:", error);
      throw new BadRequestException("Failed to create service");
    }
  }

  async findAllServices(): Promise<Service[]> {
    return this.serviceModel.find().exec();
  }

  async findActiveServices(): Promise<Service[]> {
    return this.serviceModel.find({ isActive: true }).exec();
  }

  async findServiceById(id: string): Promise<Service> {
    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException("Service not found");
    }
    return service;
  }

  async updateService(
    id: string,
    updateData: Partial<CreateServiceDto>,
  ): Promise<Service> {
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

  // Bundle CRUD operations
  async createBundle(createBundleDto: CreateBundleDto): Promise<Bundle> {
    try {
      const bundle = new this.bundleModel(createBundleDto);
      return await bundle.save();
    } catch (error) {
      this.logger.error("Error creating bundle:", error);
      throw new BadRequestException("Failed to create bundle");
    }
  }

  async findAllBundles(): Promise<Bundle[]> {
    return this.bundleModel.find().populate("packages").exec();
  }

  async findBundleById(id: string): Promise<Bundle> {
    const bundle = await this.bundleModel
      .findById(id)
      .populate("packages")
      .exec();
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  async updateBundle(
    id: string,
    updateData: Partial<CreateBundleDto>,
  ): Promise<Bundle> {
    const bundle = await this.bundleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("packages")
      .exec();
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  async deleteBundle(id: string): Promise<void> {
    const result = await this.bundleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException("Bundle not found");
    }
  }

  // Preset Bundle CRUD operations
  async createPresetBundle(
    createPresetBundleDto: CreatePresetBundleDto,
  ): Promise<Bundle> {
    return this.createBundle(createPresetBundleDto);
  }

  async findAllPresetBundles(): Promise<Bundle[]> {
    return this.bundleModel.find({ isPreset: true }).exec();
  }
}
