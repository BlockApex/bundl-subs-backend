import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Offer, OfferSchema } from "src/dvm/schemas/offer.schema";
import { Package, PackageSchema } from "src/dvm/schemas/package.schema";
import type { ServiceDocument } from "src/dvm/schemas/service.schema";

export type SelectedPackageDocument = SelectedPackage & Document;

@Schema()
export class SelectedPackage {
  @Prop({ type: Types.ObjectId, ref: "Service", required: true })
  service: ServiceDocument;

  @Prop({ type: [PackageSchema], required: true })
  package: Package[];

  @Prop({ type: [OfferSchema], required: true })
  applicableOffers: Offer[];
}

export const SelectedPackageSchema =
  SchemaFactory.createForClass(SelectedPackage);
