import { Offer } from "src/dvm/schemas/offer.schema";
import { PackageDocument } from "src/dvm/schemas/package.schema";
import { ServiceDocument } from "src/dvm/schemas/service.schema";

export class BundlePreviewResponseDto {
  name?: string;
  description?: string;
  packages: {
    service: ServiceDocument;
    package: PackageDocument;
    applicableOffers: Offer[];
  }[];
  frequency: string;
  totalFirstDiscountedPrice: number;
  totalOriginalPrice: number;
  priceEveryInterval: number[];
}
