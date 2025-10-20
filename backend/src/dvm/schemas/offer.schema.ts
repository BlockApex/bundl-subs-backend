import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import {
  BundlRestrictions,
  BundlRestrictionsSchema,
} from "./bundl-restrictions.schema";

export type OfferDocument = Offer & Document;

@Schema({ _id: false })
export class Offer {
  @Prop({ required: true, enum: ["free", "%discount", "fixed discount"] })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  period: string; // n days/months/week || "unlimited"

  @Prop({ type: BundlRestrictionsSchema, required: true })
  bundlRestrictions: BundlRestrictions;

  @Prop({ type: [String], required: true })
  allowedCustomerTypes: string[];

  @Prop({ required: true })
  termsAndConditions: string;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
