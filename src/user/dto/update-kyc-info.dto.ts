import { IsObject, ValidateIf } from "class-validator";

export class UpdateKycInfoDto {
  @IsObject()
  @ValidateIf((object, value) => JSON.stringify(value).length <= 10000)
  kycInfo: Record<string, unknown>;
}
