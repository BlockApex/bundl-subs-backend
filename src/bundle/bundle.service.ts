import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { DvmService } from "src/dvm/dvm.service";
import { PackageDocument } from "src/dvm/schemas/package.schema";
import { UserDocument } from "src/user/schemas/user.schema";
import { Offer } from "../dvm/schemas/offer.schema";
import { ServiceDocument } from "../dvm/schemas/service.schema";
import { BundlePreviewRequestDto } from "./dto/bundle-preview-request.dto";
import { BundlePreviewResponseDto } from "./dto/bundle-preview-response.dto";
import {
  CreateBundleDto,
  CreatePresetBundleDto,
} from "./dto/create-bundle.dto";
import { Bundle, BundleDocument } from "./schemas/bundle.schema";

@Injectable()
export class BundleService {
  private readonly logger = new Logger(BundleService.name);

  constructor(
    @InjectModel(Bundle.name) private bundleModel: Model<BundleDocument>,
    @Inject() private dvmService: DvmService,
  ) {}

  async previewBundle(
    request: BundlePreviewRequestDto,
  ): Promise<BundlePreviewResponseDto> {
    // Get all services with their packages
    const serviceIds = request.selectedPackages.map((p) => p.service);
    const services: ServiceDocument[] = (
      await this.dvmService.findActiveServices()
    ).filter((service) => serviceIds.includes(service.id as string));

    // does not contain subdocuments
    const serviceRootDocuments: ServiceDocument[] =
      await this.dvmService.findServiceRootDocumentsByIds(serviceIds);

    // Create a map of serviceId to service for quick lookup
    const serviceMap = new Map<string, ServiceDocument>();
    services.forEach((service) => {
      serviceMap.set(service.id as string, service);
    });
    const serviceRootDocumentMap = new Map<string, ServiceDocument>();
    serviceRootDocuments.forEach((service) => {
      serviceRootDocumentMap.set(service.id as string, service);
    });

    // Create a map of serviceId to package for quick lookup
    const packageMap = new Map<string, PackageDocument>();
    request.selectedPackages.forEach((selectedPackage) => {
      const packageData: PackageDocument = serviceMap
        .get(selectedPackage.service)!
        .packages.find(
          (pkg: PackageDocument) => pkg.id === selectedPackage.package,
        ) as PackageDocument;
      if (packageData) {
        packageMap.set(selectedPackage.package, packageData);
      } else {
        throw new BadRequestException(
          `Package not found with id: ${selectedPackage.package} in service with id: ${selectedPackage.service}`,
        );
      }
    });

    // verify all packages have same frequency
    const firstFrequency = packageMap.get(
      request.selectedPackages[0].package,
    )?.frequency;
    for (const pkg of packageMap.values()) {
      if (pkg.frequency !== firstFrequency) {
        throw new BadRequestException(
          "All selected packages must have the same frequency",
        );
      }
    }

    // Build package details and collect all offers
    const packageDetails: {
      service: ServiceDocument;
      package: PackageDocument;
      applicableOffers: Offer[];
    }[] = [];
    let totalOriginalPrice = 0;

    for (const selectedPackage of request.selectedPackages) {
      const packageData: PackageDocument = packageMap.get(
        selectedPackage.package,
      )!;
      // Add package details
      packageDetails.push({
        service: serviceRootDocumentMap.get(selectedPackage.service)!,
        package: packageData,
        applicableOffers: this.filterApplicableBundleOffers(
          packageData.offers,
          request.selectedPackages.map((p) => p.service),
          request.selectedPackages.length,
        ),
      });

      // Add package offers
      totalOriginalPrice += packageData.amount;
    }

    // Calculate total discounted price
    const totalFirstDiscountedPrice = packageDetails.reduce(
      (sum, packageDetail) => {
        const discountedPrice = this.calculateDiscountedPrice(
          packageDetail.package.amount,
          packageDetail.applicableOffers,
          0,
          firstFrequency!,
        );
        return sum + discountedPrice;
      },
      0,
    );

    const priceEveryInterval = this.calculatePriceEveryInterval(
      packageDetails,
      firstFrequency!,
    );

    return {
      packages: packageDetails,
      frequency: firstFrequency!,
      totalFirstDiscountedPrice,
      totalOriginalPrice,
      priceEveryInterval,
    };
  }

  private filterApplicableBundleOffers(
    offers: Offer[],
    selectedServiceIds: string[],
    bundleItemCount: number,
  ): Offer[] {
    return offers.filter((offer) => {
      const restrictions = offer.bundlRestrictions;

      // Check minimum bundle items requirement
      if (bundleItemCount < restrictions.minimumBundleItems) {
        return false;
      }

      // Check if all mandatory services are included
      const mandatoryServices = restrictions.mandatoryListOfServices.map((id) =>
        id.toString(),
      );
      const hasAllMandatoryServices = mandatoryServices.every((serviceId) =>
        selectedServiceIds.includes(serviceId),
      );

      return hasAllMandatoryServices;
    });
  }

  public calculateDiscountedPrice(
    packageAmount: number,
    offers: Offer[],
    interval: number,
    frequency: string,
  ): number {
    const filteredOffers = this.filterOffersForInterval(
      offers,
      interval,
      frequency,
    );

    // Apply offers (assuming the best applicable offer per package)
    // This is a simplified calculation - you might want to implement more complex logic
    let maxDiscount = 0;
    for (const filteredOffer of filteredOffers) {
      if (filteredOffer.offer.type === "free") {
        // Handle free offers
        maxDiscount = Math.max(maxDiscount, filteredOffer.percentageValid);
      } else if (filteredOffer.offer.type === "%discount") {
        // Handle percentage discount
        maxDiscount = Math.max(
          maxDiscount,
          (filteredOffer.offer.amount * filteredOffer.percentageValid) / 100,
        );
      } else if (filteredOffer.offer.type === "fixed discount") {
        // Handle fixed discount
        const discount = (filteredOffer.offer.amount / packageAmount) * 100;
        maxDiscount = Math.max(
          maxDiscount,
          (discount * filteredOffer.percentageValid) / 100,
        );
      }
    }

    return Math.round(packageAmount * (100 - maxDiscount)) / 100; // Round to 2 decimal places
  }

  private filterOffersForInterval(
    offers: Offer[],
    interval: number,
    frequency: string,
  ): { offer: Offer; percentageValid: number }[] {
    const filteredOffers: { offer: Offer; percentageValid: number }[] = [];
    for (const offer of offers) {
      if (offer.period === "unlimited") {
        filteredOffers.push({
          offer,
          percentageValid: 100,
        });
        continue;
      }
      const [count, periodFrequency] = [
        Number(offer.period.split(" ")[0]),
        offer.period.split(" ")[1],
      ];
      const periodDays = this.periodToDays(count, periodFrequency);
      const frequencyDays = this.frequenceToDays(frequency);
      const intervalDays = frequencyDays * interval;
      if (periodDays <= intervalDays) {
        continue;
      } else {
        filteredOffers.push({
          offer,
          percentageValid: Math.min(
            100,
            Math.floor(((periodDays - intervalDays) / frequencyDays) * 100),
          ),
        });
      }
    }
    return filteredOffers;
  }

  private frequenceToDays(frequency: string): number {
    switch (frequency) {
      case "annually":
        return 365;
      case "monthly":
        return 30;
      case "weekly":
        return 7;
      case "daily":
        return 1;
      default:
        return 0;
    }
  }

  private periodToDays(count: number, periodFrequency: string): number {
    switch (periodFrequency) {
      case "days":
      case "day":
        return count;
      case "weeks":
      case "week":
        return count * 7;
      case "months":
      case "month":
        return count * 30;
      case "years":
      case "year":
        return count * 365;
      default:
        throw new BadRequestException(
          `Invalid period frequency: ${periodFrequency}`,
        );
    }
  }

  private calculatePriceEveryInterval(
    packages: {
      package: PackageDocument;
      applicableOffers: Offer[];
    }[],
    frequency: string,
  ): number[] {
    let maxIntervals: number;
    if (frequency === "monthly") {
      maxIntervals = 12;
    } else if (frequency === "weekly") {
      maxIntervals = 52;
    } else {
      maxIntervals = 5;
    }

    const prices: number[] = [];
    for (let i = 0; i < maxIntervals; i++) {
      const totalFirstDiscountedPrice = packages.reduce(
        (sum, packageDetail) => {
          const discountedPrice = this.calculateDiscountedPrice(
            packageDetail.package.amount,
            packageDetail.applicableOffers,
            i,
            frequency,
          );
          return sum + discountedPrice;
        },
        0,
      );
      prices.push(totalFirstDiscountedPrice);
    }
    return prices;
  }

  // Bundle CRUD operations
  async createBundle(
    createBundleDto: CreateBundleDto,
    user: UserDocument,
  ): Promise<Bundle> {
    try {
      const previewBundle = await this.previewBundle({
        selectedPackages: createBundleDto.selectedPackages,
      });
      const bundle = new this.bundleModel({
        ...createBundleDto,
        selectedPackages: previewBundle.packages.map((pkg) => ({
          service: pkg.service,
          package: pkg.package,
          applicableOffers: pkg.applicableOffers,
        })),
        frequency: previewBundle.frequency,
        totalFirstDiscountedPrice: previewBundle.totalFirstDiscountedPrice,
        totalOriginalPrice: previewBundle.totalOriginalPrice,
        priceEveryInterval: previewBundle.priceEveryInterval,
        createdBy: user,
      });
      return await (
        await bundle.save()
      ).populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      );
    } catch (error) {
      this.logger.error("Error creating bundle:", error);
      throw new BadRequestException("Failed to create bundle");
    }
  }

  async findAllBundles(user: UserDocument): Promise<Bundle[]> {
    return this.bundleModel
      .find({
        createdBy: Types.ObjectId.createFromHexString(user.id as string),
        isActive: true,
      })
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      )
      .exec();
  }

  async findActiveBundleById(id: string): Promise<BundleDocument> {
    const bundle = await this.bundleModel
      .findOne({ _id: Types.ObjectId.createFromHexString(id), isActive: true })
      .populate("createdBy", "walletAddress")
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      )
      .exec();
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  async findActiveBundleByIdWithServiceDetails(
    id: string,
  ): Promise<BundleDocument> {
    const bundle = await this.bundleModel
      .findOne({ _id: Types.ObjectId.createFromHexString(id), isActive: true })
      .populate("createdBy", "walletAddress")
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive walletAddress emailAddress webhookUrl",
      )
      .exec();
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  async findBundleById(id: string): Promise<Bundle> {
    const bundle = await this.bundleModel
      .findById(id)
      .populate("createdBy", "walletAddress")
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
    const computedUpdateData: Partial<CreateBundleDto> &
      Partial<{
        totalFirstDiscountedPrice: number;
        totalOriginalPrice: number;
        priceEveryInterval: number[];
      }> = {
      ...updateData,
    };
    if (updateData.selectedPackages) {
      const previewBundle = await this.previewBundle({
        selectedPackages: updateData.selectedPackages,
      });
      computedUpdateData.totalFirstDiscountedPrice =
        previewBundle.totalFirstDiscountedPrice;
      computedUpdateData.totalOriginalPrice = previewBundle.totalOriginalPrice;
      computedUpdateData.priceEveryInterval = previewBundle.priceEveryInterval;
    }
    const bundle = await this.bundleModel
      .findByIdAndUpdate(id, computedUpdateData, { new: true })
      .exec();
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  // Preset Bundle CRUD operations
  async createPresetBundle(
    createPresetBundleDto: CreatePresetBundleDto,
    user: UserDocument,
  ): Promise<Bundle> {
    return this.createBundle(createPresetBundleDto, user);
  }

  async findAllPresetBundles(): Promise<Bundle[]> {
    return this.bundleModel
      .find({ isPreset: true })
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      )
      .exec();
  }

  // Bundle deactivation methods
  async deactivateBundle(id: string): Promise<Bundle> {
    const bundle = await this.bundleModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      )
      .exec();

    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }

  async reactivateBundle(id: string): Promise<Bundle> {
    const bundle = await this.bundleModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .populate(
        "selectedPackages.service",
        "name logo category description allowedCustomerTypes isActive",
      )
      .exec();

    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return bundle;
  }
}
