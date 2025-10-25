import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type RequiredFormFieldDocument = RequiredFormField & Document;

@Schema({ _id: false })
export class RequiredFormField {
  @Prop({ required: true })
  fieldName: string;

  @Prop({ required: true })
  fieldType: string;

  @Prop({ required: true, default: false })
  optional: boolean;
}

export const RequiredFormFieldSchema =
  SchemaFactory.createForClass(RequiredFormField);
