import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { UserDocument } from "src/user/schemas/user.schema";
import { PaymentService } from "./payment.service";

@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("bundle/:id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async triggerPayment(
    @Param("id") bundleId: string,
    @CurrentUser() user: UserDocument,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.paymentService.triggerBundlePayment(bundleId, user, payload);
  }
}
