import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class RequiredFormFieldDto {
  @IsString()
  fieldName: string;

  @IsString()
  fieldType: string;

  @IsBoolean()
  @IsOptional()
  optional?: boolean;
}

export class BundlRestrictionsDto {
  @IsNumber()
  minimumBundleItems: number;

  @IsArray()
  @IsString({ each: true })
  mandatoryListOfServices: string[];
}

export class OfferDto {
  @IsString()
  type: string;

  @IsNumber()
  amount: number;

  @IsString()
  period: string;

  @ValidateNested()
  @Type(() => BundlRestrictionsDto)
  bundlRestrictions: BundlRestrictionsDto;

  @IsArray()
  @IsString({ each: true })
  allowedCustomerTypes: string[];

  @IsString()
  termsAndConditions: string;
}

export class PackageDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsString()
  frequency: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredFormFieldDto)
  requiredFormFields?: RequiredFormFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDto)
  offers?: OfferDto[];
}

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsString()
  logo: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  allowedCustomerTypes: string[];

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  @IsString()
  emailAddress?: string;

  @IsOptional()
  @IsString()
  walletAddress?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages?: PackageDto[];
}
