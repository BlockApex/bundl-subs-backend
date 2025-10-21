import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DvmController } from "./dvm.controller";
import { DvmService } from "./dvm.service";
import { Bundle, BundleSchema } from "./schemas/bundle.schema";
import { Service, ServiceSchema } from "./schemas/service.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Bundle.name, schema: BundleSchema },
    ]),
  ],
  providers: [DvmService],
  controllers: [DvmController],
  exports: [DvmService],
})
export class DvmModule {}
