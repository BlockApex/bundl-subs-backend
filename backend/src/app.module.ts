import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BundleModule } from "./bundle/bundle.module";
import { DvmModule } from "./dvm/dvm.module";
import { PaymentModule } from "./payment/payment.module";
import { ShutdownObserver } from "./shutdown-observer";
import { SubscriptionModule } from "./subscription/subscription.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    AuthModule,
    DvmModule,
    BundleModule,
    SubscriptionModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService, ShutdownObserver],
})
export class AppModule {}
