import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type BundlRestrictionsDocument = BundlRestrictions & Document;

@Schema({ _id: false })
export class BundlRestrictions {
  @Prop({ required: true })
  minimumBundleItems: number;

  @Prop({ type: [Types.ObjectId], ref: "Service", required: true })
  mandatoryListOfServices: Types.ObjectId[];
}

export const BundlRestrictionsSchema =
  SchemaFactory.createForClass(BundlRestrictions);
