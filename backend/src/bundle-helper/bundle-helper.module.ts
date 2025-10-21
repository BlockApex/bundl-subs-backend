import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ServiceSchema } from "../dvm/schemas/service.schema";
import { BundleHelperController } from "./bundle-helper.controller";
import { BundleHelperService } from "./bundle-helper.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Service", schema: ServiceSchema }]),
  ],
  providers: [BundleHelperService],
  controllers: [BundleHelperController],
  exports: [BundleHelperService],
})
export class BundleHelperModule {}
