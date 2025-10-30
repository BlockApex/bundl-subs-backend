import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ProvidedFormFieldDocument = ProvidedFormField & Document;

@Schema({ _id: false })
export class ProvidedFormField {
  @Prop({ required: true })
  fieldName: string;

  @Prop({ required: false })
  fieldValue?: string;
}

export const ProvidedFormFieldSchema =
  SchemaFactory.createForClass(ProvidedFormField);
