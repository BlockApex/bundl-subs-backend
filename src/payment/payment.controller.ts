import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { UserDocument } from "src/user/schemas/user.schema";
import { TriggerPaymentDto } from "./dto/trigger-payment.dto";
import { PaymentService } from "./payment.service";

@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("begin-subscription")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async triggerSubscriptionFirstPayment(
    @CurrentUser() user: UserDocument,
    @Body() payload: TriggerPaymentDto,
  ) {
    return this.paymentService.triggerSubscriptionFirstPayment(user, payload);
  }
}
