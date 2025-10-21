import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PackageDocument } from "src/dvm/schemas/package.schema";
import { Offer } from "../dvm/schemas/offer.schema";
import { ServiceDocument } from "../dvm/schemas/service.schema";
import { BundlePreviewRequestDto } from "./dto/bundle-preview-request.dto";
import { BundlePreviewResponseDto } from "./dto/bundle-preview-response.dto";

@Injectable()
export class BundleHelperService {
  constructor(
    @InjectModel("Service") private serviceModel: Model<ServiceDocument>,
  ) {}

  async previewBundle(
    request: BundlePreviewRequestDto,
  ): Promise<BundlePreviewResponseDto> {
    // Get all services with their packages
    const services = await this.serviceModel
      .find({
        _id: {
          $in: request.selectedPackages.map(
            (p) => new Types.ObjectId(p.serviceId),
          ),
        },
      })
      .exec();

    // Create a map of serviceId to service for quick lookup
    const serviceMap = new Map<string, ServiceDocument>();
    services.forEach((service) => {
      serviceMap.set(service.id as string, service);
    });

    // Create a map of serviceId to package for quick lookup
    const packageMap = new Map<string, PackageDocument>();
    request.selectedPackages.forEach((selectedPackage) => {
      const packageData: PackageDocument = serviceMap
        .get(selectedPackage.serviceId)!
        .packages.find(
          (pkg: PackageDocument) => pkg.id === selectedPackage.packageId,
        ) as PackageDocument;
      if (packageData) {
        packageMap.set(selectedPackage.packageId, packageData);
      } else {
        throw new BadRequestException(
          `Package not found with id: ${selectedPackage.packageId} in service with id: ${selectedPackage.serviceId}`,
        );
      }
    });

    // verify all packages have same frequency
    const firstFrequency = packageMap.get(
      request.selectedPackages[0].packageId,
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
      serviceId: string;
      packageId: string;
      serviceName: string;
      packageName: string;
      amount: number;
      offers: Offer[];
    }[] = [];
    let totalOriginalPrice = 0;

    for (const selectedPackage of request.selectedPackages) {
      const service = serviceMap.get(selectedPackage.serviceId)!;
      const packageData = packageMap.get(selectedPackage.packageId)!;

      // Add package details
      packageDetails.push({
        serviceId: selectedPackage.serviceId,
        packageId: selectedPackage.packageId,
        serviceName: service.name,
        packageName: packageData.name,
        amount: packageData.amount,
        offers: this.filterApplicableBundleOffers(
          packageData.offers,
          request.selectedPackages.map((p) => p.serviceId),
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
          packageDetail,
          packageDetail.offers,
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

  private calculateDiscountedPrice(
    packageDetail: {
      serviceId: string;
      packageId: string;
      amount: number;
    },
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
        const discount =
          (filteredOffer.offer.amount / packageDetail.amount) * 100;
        maxDiscount = Math.max(
          maxDiscount,
          (discount * filteredOffer.percentageValid) / 100,
        );
      }
    }

    return Math.round(packageDetail.amount * (100 - maxDiscount)) / 100; // Round to 2 decimal places
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
            Math.floor((periodDays / (intervalDays + frequencyDays)) * 100),
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
      serviceId: string;
      packageId: string;
      serviceName: string;
      packageName: string;
      amount: number;
      offers: Offer[];
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
            packageDetail,
            packageDetail.offers,
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
}
