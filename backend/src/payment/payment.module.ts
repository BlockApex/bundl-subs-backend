import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "src/auth/auth.module";
import { BundleModule } from "src/bundle/bundle.module";
import {
  UserSubscription,
  UserSubscriptionSchema,
} from "src/subscription/schemas/user-subscription.schema";
import { SubscriptionModule } from "src/subscription/subscription.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
    AuthModule,
    BundleModule,
    SubscriptionModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
