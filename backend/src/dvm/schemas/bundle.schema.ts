import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Offer, OfferSchema } from "./offer.schema";

export type BundleDocument = Bundle & Document;

@Schema({ timestamps: true })
export class Bundle {
  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  color: string;

  @Prop({ default: false, required: true })
  isPreset: boolean;

  @Prop({ type: [Types.ObjectId], ref: "Package", required: true })
  packages: Types.ObjectId[];

  @Prop({ type: [OfferSchema], default: [] })
  offers: Offer[];

  @Prop({ required: true, enum: ["weekly", "monthly", "yearly"] })
  frequency: string;

  @Prop({ required: true })
  totalDiscountedPrice: number;

  @Prop({ required: true })
  totalOriginalPrice: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BundleSchema = SchemaFactory.createForClass(Bundle);
