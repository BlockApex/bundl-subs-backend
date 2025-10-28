import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Package, PackageSchema } from "src/dvm/schemas/package.schema";
import type { ServiceDocument } from "src/dvm/schemas/service.schema";
import {
  ProvidedFormField,
  ProvidedFormFieldSchema,
} from "./required-form-field.schema";

export type ClaimedPackageDocument = ClaimedPackage & Document;

@Schema({ timestamps: true })
export class ClaimedPackage {
  @Prop({ type: Types.ObjectId, ref: "Service", required: true })
  service: ServiceDocument;

  @Prop({ type: PackageSchema, required: true })
  package: Package;

  @Prop({ type: [ProvidedFormFieldSchema], default: [] })
  providedFormFields: ProvidedFormField[];

  @Prop({ required: false })
  claimInstructions?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ClaimedPackageSchema =
  SchemaFactory.createForClass(ClaimedPackage);
