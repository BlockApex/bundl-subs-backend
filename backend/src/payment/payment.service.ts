import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { BundleService } from "src/bundle/bundle.service";
import type { Bundle } from "src/bundle/schemas/bundle.schema";
import {
  UserSubscription,
  UserSubscriptionDocument,
} from "src/subscription/schemas/user-subscription.schema";
import type { UserDocument } from "src/user/schemas/user.schema";

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<UserSubscriptionDocument>,
    private readonly bundleService: BundleService,
  ) {}

  async triggerBundlePayment(
    bundleId: string,
    user: UserDocument,
    _payload: Record<string, unknown>,
  ) {
    void _payload;
    const bundle: Bundle =
      await this.bundleService.findActiveBundleById(bundleId);
    if (!bundle) throw new NotFoundException("Bundle not found");

    const subscription = await this.userSubscriptionModel.findOne({
      user: Types.ObjectId.createFromHexString(user.id as string),
      bundle: Types.ObjectId.createFromHexString(bundleId),
    });

    if (!subscription) {
      throw new BadRequestException("Subscription not found");
    }

    // Stub: verify on-chain that sub is added and approval exists
    const verified = this.verifyOnchainSubscriptionAndApprovalStub(
      user.walletAddress,
      bundleId,
    );
    if (!verified) {
      throw new BadRequestException("On-chain verification failed");
    }

    // Create invoice for this payment attempt
    const invoice = {
      date: new Date(),
      status: "pending" as const,
      amount:
        bundle.priceEveryInterval?.[0] ?? bundle.totalFirstDiscountedPrice,
      paymentHistory: [],
    };

    subscription.invoices.push(invoice as any);
    await subscription.save();

    // Stub: trigger pull payment
    const txHash = this.triggerPullPaymentStub(user.walletAddress, bundleId);

    // Update invoice status
    const lastInvoice = subscription.invoices[subscription.invoices.length - 1];
    lastInvoice.status = "paid";
    lastInvoice.paymentHistory.push({
      time: new Date(),
      status: "success",
      txHash,
    });
    subscription.status = "active";
    await subscription.save();

    return { success: true, txHash };
  }

  private verifyOnchainSubscriptionAndApprovalStub(
    _userWallet: string,
    _bundleId: string,
  ): boolean {
    // Placeholder: return true as if verified
    void _userWallet;
    void _bundleId;
    return true;
  }

  private triggerPullPaymentStub(
    _userWallet: string,
    _bundleId: string,
  ): string {
    // Placeholder: return mock tx hash
    void _userWallet;
    void _bundleId;
    return "0xpull-tx-hash";
  }
}
