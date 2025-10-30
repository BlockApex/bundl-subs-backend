import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { SelectedPackageDto } from "./selected-package.dto";

export class BundlePreviewRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedPackageDto)
  selectedPackages: SelectedPackageDto[];
}
