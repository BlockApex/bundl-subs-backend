import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from "src/auth/auth.guard";
import { UserDocument } from "src/user/schemas/user.schema";
import { SubscriptionService } from "./subscription.service";

@Injectable()
export class UserSubscriptionGuard extends AuthGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // First check if user is authenticated
    const isAuthenticated = super.canActivate(context);

    if (typeof isAuthenticated === "boolean") {
      if (!isAuthenticated) {
        return false;
      }
    } else if (isAuthenticated instanceof Promise) {
      // If it's a Promise, we need to handle it differently
      return isAuthenticated.then((authResult) => {
        if (!authResult) {
          return false;
        }
        return this.checkIsUserSubscription(context);
      });
    }

    return this.checkIsUserSubscription(context);
  }

  private async checkIsUserSubscription(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const subscriptionId = request.params.id;
    const user = request.user as UserDocument;
    const subscription =
      await this.subscriptionService.findSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }
    return (subscription.user as UserDocument).id === user.id;
  }
}
