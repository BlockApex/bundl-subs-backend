import { IsNotEmpty, IsString } from "class-validator";

export class SelectedPackageDto {
  @IsString()
  @IsNotEmpty()
  service: string;

  @IsString()
  @IsNotEmpty()
  package: string;
}
