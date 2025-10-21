import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { OfferDto } from "./create-service.dto";

export class CreateBundleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  packages: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageActiveOffers)
  offers: PackageActiveOffers[];

  @IsString()
  frequency: string;

  @IsNumber()
  totalDiscountedPrice: number;

  @IsNumber()
  totalOriginalPrice: number;
}

export class CreatePresetBundleDto extends CreateBundleDto {
  @IsBoolean()
  isPreset: boolean;
}

export class PackageActiveOffers {
  @IsString()
  package: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDto)
  offers: OfferDto[];
}
