import { Offer } from "src/dvm/schemas/offer.schema";

export class BundlePreviewResponseDto {
  name?: string;
  description?: string;
  packages: {
    serviceId: string;
    packageId: string;
    serviceName: string;
    packageName: string;
    amount: number;
    offers: Offer[];
  }[];
  frequency: string;
  totalFirstDiscountedPrice: number;
  totalOriginalPrice: number;
  priceEveryInterval: number[];
}
