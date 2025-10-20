import { IsNotEmpty, IsString } from "class-validator";

export class CreatePresetBundleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  bundle: string;
}
