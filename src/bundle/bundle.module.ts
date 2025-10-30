import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DvmModule } from "src/dvm/dvm.module";
import { BundleController } from "./bundle.controller";
import { BundleService } from "./bundle.service";
import { Bundle, BundleSchema } from "./schemas/bundle.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bundle.name, schema: BundleSchema }]),
    DvmModule,
  ],
  providers: [BundleService],
  controllers: [BundleController],
  exports: [BundleService],
})
export class BundleModule {}
