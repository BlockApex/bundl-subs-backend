import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  ServeStaticModule,
  ServeStaticModuleOptions,
} from "@nestjs/serve-static";
import { existsSync, mkdirSync } from "fs";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BundleModule } from "./bundle/bundle.module";
import { DvmModule } from "./dvm/dvm.module";
import { ShutdownObserver } from "./extras/shutdown-observer";
import { PaymentModule } from "./payment/payment.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { UserModule } from "./user/user.module";
import { WaitlistModule } from "./waitlist/waitlist.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
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
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (
        configService: ConfigService,
      ): ServeStaticModuleOptions[] => {
        const uploadsDir = configService.get<string>("UPLOADS_DIR")!;
        if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
        return [
          {
            rootPath: uploadsDir,
            serveRoot: configService.get("UPLOADS_PREFIX"),
          },
        ];
      },
      inject: [ConfigService],
    }),
    WaitlistModule,
  ],
  controllers: [AppController],
  providers: [AppService, ShutdownObserver],
})
export class AppModule {}
