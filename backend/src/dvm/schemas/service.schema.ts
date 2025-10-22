import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { Package, PackageSchema } from "./package.schema";

export type ServiceDocument = HydratedDocument<
  Service & ServiceDocumentOverride
>;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  logo: string;

  @Prop({ required: true, lowercase: true })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], required: true })
  allowedCustomerTypes: string[]; // new/existing/returning

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [PackageSchema], default: [] })
  packages: Package[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

export type ServiceDocumentOverride = {
  packages: Types.DocumentArray<Package>;
};
