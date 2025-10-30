import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

export class ClaimSubscriptionDto {
  @IsString()
  subscription: string;

  @IsString()
  service: string;

  @IsString()
  package: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProvidedFormFieldDto)
  providedFormFields: ProvidedFormFieldDto[];
}

export class ProvidedFormFieldDto {
  @IsString()
  fieldName: string;

  @IsOptional()
  @IsString()
  fieldValue?: string;
}
