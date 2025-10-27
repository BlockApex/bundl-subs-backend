import { IsString } from "class-validator";

export class TriggerPaymentDto {
  @IsString()
  subscriptionId: string;
}
