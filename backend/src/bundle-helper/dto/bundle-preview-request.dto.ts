import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";

export class SelectedPackageDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;
}

export class BundlePreviewRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedPackageDto)
  selectedPackages: SelectedPackageDto[];
}
