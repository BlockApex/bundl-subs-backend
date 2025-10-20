import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { Offer, OfferSchema } from "./offer.schema";
import {
  RequiredFormField,
  RequiredFormFieldSchema,
} from "./required-form-field.schema";

export type PackageDocument = Package & Document;

@Schema({ _id: false })
export class Package {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  frequency: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [RequiredFormFieldSchema], default: [] })
  requiredFormFields: RequiredFormField[];

  @Prop({ type: [OfferSchema], default: [] })
  offers: Offer[];
}

export const PackageSchema = SchemaFactory.createForClass(Package);
