import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import type { UserDocument } from "src/user/schemas/user.schema";
import { ClaimSubscriptionDto } from "./dto/claim-subscription.dto";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { PrepareSubscriptionDto } from "./dto/prepare-subscription.dto";
import { SubscriptionService } from "./subscription.service";
import { UserSubscriptionGuard } from "./user-subscription.guard";

@Controller("subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiateSubscription(
    @CurrentUser() user: UserDocument,
    @Body() body: CreateSubscriptionDto,
  ) {
    return this.subscriptionService.initiateSubscription(user, body);
  }

  @Post("prepare")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async prepareSubscription(
    @CurrentUser() user: UserDocument,
    @Body() body: PrepareSubscriptionDto,
  ) {
    return this.subscriptionService.prepareSubscription(user, body);
  }

  @Get()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMySubscriptions(@CurrentUser() user: UserDocument) {
    return this.subscriptionService.findUserSubscriptions(user.id as string);
  }

  @Get(":id")
  @UseGuards(UserSubscriptionGuard)
  @HttpCode(HttpStatus.OK)
  async getSubscription(@Param("id") id: string) {
    return this.subscriptionService.findSubscriptionById(id);
  }

  @Post(":id/claim")
  @UseGuards(UserSubscriptionGuard)
  @HttpCode(HttpStatus.OK)
  async claimSubscriptionPackage(@Body() body: ClaimSubscriptionDto) {
    return this.subscriptionService.claimSubscriptionPackage(body);
  }
}
