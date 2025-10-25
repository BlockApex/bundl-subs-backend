import {
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
import { SubscriptionService } from "./subscription.service";

@Controller("subscribe")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post("bundle/:id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async subscribeToBundle(
    @Param("id") bundleId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.subscriptionService.initiateSubscription(bundleId, user);
  }
}
