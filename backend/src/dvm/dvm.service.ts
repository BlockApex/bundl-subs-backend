import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateBundleDto } from "./dto/create-bundle.dto";
import { CreatePresetBundleDto } from "./dto/create-preset-bundle.dto";
import { CreateServiceDto } from "./dto/create-service.dto";
import { Bundle, BundleDocument } from "./schemas/bundle.schema";
import {
  PresetBundle,
  PresetBundleDocument,
} from "./schemas/preset-bundle.schema";
import { Service, ServiceDocument } from "./schemas/service.schema";

@Injectable()
export class DvmService {
  private readonly logger = new Logger(DvmService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    @InjectModel(Bundle.name) private bundleModel: Model<BundleDocument>,
    @InjectModel(PresetBundle.name)
    private presetBundleModel: Model<PresetBundleDocument>,
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
  ): Promise<PresetBundle> {
    try {
      // Verify that the referenced bundle exists
      const bundle = await this.bundleModel
        .findById(createPresetBundleDto.bundle)
        .exec();
      if (!bundle) {
        throw new BadRequestException("Referenced bundle does not exist");
      }

      const presetBundle = new this.presetBundleModel(createPresetBundleDto);
      return await presetBundle.save();
    } catch (error) {
      this.logger.error("Error creating preset bundle:", error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to create preset bundle");
    }
  }

  async findAllPresetBundles(): Promise<PresetBundle[]> {
    return this.presetBundleModel.find().populate("bundle").exec();
  }

  async findPresetBundleById(id: string): Promise<PresetBundle> {
    const presetBundle = await this.presetBundleModel
      .findById(id)
      .populate("bundle")
      .exec();
    if (!presetBundle) {
      throw new NotFoundException("Preset bundle not found");
    }
    return presetBundle;
  }

  async updatePresetBundle(
    id: string,
    updateData: Partial<CreatePresetBundleDto>,
  ): Promise<PresetBundle> {
    // If bundle is being updated, verify it exists
    if (updateData.bundle) {
      const bundle = await this.bundleModel.findById(updateData.bundle).exec();
      if (!bundle) {
        throw new BadRequestException("Referenced bundle does not exist");
      }
    }

    const presetBundle = await this.presetBundleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("bundle")
      .exec();
    if (!presetBundle) {
      throw new NotFoundException("Preset bundle not found");
    }
    return presetBundle;
  }

  async deletePresetBundle(id: string): Promise<void> {
    const result = await this.presetBundleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException("Preset bundle not found");
    }
  }
}
