import { IsNumber, IsString } from "class-validator";

export class PrepareSubscriptionDto {
  @IsString()
  bundleId: string;

  @IsNumber()
  numberOfIntervals: number;
}
