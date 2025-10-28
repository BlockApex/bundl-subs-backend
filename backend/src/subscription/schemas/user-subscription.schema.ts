import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";
import { Bundle } from "src/bundle/schemas/bundle.schema";
import { User } from "src/user/schemas/user.schema";
import { ClaimedPackage, ClaimedPackageSchema } from "./claimed-package.schema";

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;
export type InvoiceDocument = HydratedDocument<Invoice>;
export type PaymentHistoryEntryDocument = PaymentHistoryEntry & Document;
export type SubscriptionStatus =
  | "intended"
  | "active"
  | "paused"
  | "grace-period"
  | "cancelled"
  | "suspended";

export type InvoiceStatus = "pending" | "paid" | "failed";

export type PaymentHistoryStatus = "pending" | "success" | "failed";

@Schema({ _id: false })
export class PaymentHistoryEntry {
  @Prop({ type: Date, default: Date.now })
  time: Date;

  @Prop({ required: true, enum: ["success", "failed"] })
  status: PaymentHistoryStatus;

  @Prop({ required: false })
  txHash?: string;
}

export const PaymentHistoryEntrySchema =
  SchemaFactory.createForClass(PaymentHistoryEntry);

@Schema({ _id: true, timestamps: true })
export class Invoice {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({
    required: true,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  })
  status: InvoiceStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: [PaymentHistoryEntrySchema], default: [] })
  paymentHistory: PaymentHistoryEntry[];
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  user: User;

  @Prop({
    type: Types.ObjectId,
    ref: "Bundle",
    required: true,
    index: true,
  })
  bundle: Bundle;

  @Prop({
    required: true,
    enum: [
      "intended",
      "active",
      "paused",
      "grace-period",
      "cancelled",
      "suspended",
    ],
    default: "intended",
  })
  status: SubscriptionStatus;

  @Prop({ required: true, default: Date.now })
  subscribeDate: Date;

  @Prop({ required: true, default: Date.now })
  nextPaymentDate: Date;

  @Prop({ type: [InvoiceSchema], default: [] })
  invoices: Invoice[];

  @Prop({ type: [ClaimedPackageSchema], default: [] })
  claimedPackages: ClaimedPackage[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSubscriptionSchema =
  SchemaFactory.createForClass(UserSubscription);

UserSubscriptionSchema.index({ user: 1, bundle: 1 }, { unique: true });
