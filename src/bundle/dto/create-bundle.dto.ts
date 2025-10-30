import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { SelectedPackageDto } from "./selected-package.dto";

export class CreateBundleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedPackageDto)
  selectedPackages: SelectedPackageDto[];
}

export class CreatePresetBundleDto extends CreateBundleDto {
  @IsBoolean()
  isPreset: boolean;
}
