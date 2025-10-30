import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "src/user/schemas/user.schema";
import {
  SelectedPackage,
  SelectedPackageSchema,
} from "./selected-package.schema";

export type BundleDocument = HydratedDocument<Bundle & BundleDocumentOverride>;

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

  @Prop({ type: [SelectedPackageSchema], default: [] })
  selectedPackages: SelectedPackage[];

  @Prop({ required: true, enum: ["weekly", "monthly", "yearly"] })
  frequency: string;

  @Prop({ required: true })
  totalFirstDiscountedPrice: number;

  @Prop({ required: true })
  totalOriginalPrice: number;

  @Prop({ type: [Number], required: true })
  priceEveryInterval: number[];

  @Prop({ default: true, required: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, select: false })
  createdBy: User;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BundleSchema = SchemaFactory.createForClass(Bundle);

export type BundleDocumentOverride = {
  selectedPackages: Types.DocumentArray<SelectedPackage>;
};
