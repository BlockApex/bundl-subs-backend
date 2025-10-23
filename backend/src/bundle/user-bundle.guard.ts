import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from "src/auth/auth.guard";
import { UserDocument } from "src/user/schemas/user.schema";
import { BundleService } from "./bundle.service";

@Injectable()
export class UserBundleGuard extends AuthGuard implements CanActivate {
  constructor(private readonly bundleService: BundleService) {
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
        return this.checkIsUserBundle(context);
      });
    }

    return this.checkIsUserBundle(context);
  }

  private async checkIsUserBundle(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const bundleId = request.params.id;
    const user = request.user as UserDocument;
    const bundle = await this.bundleService.findBundleById(bundleId);
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }
    return (
      (!bundle.isPreset && (bundle.createdBy as UserDocument).id === user.id) ||
      (bundle.isPreset && user.isAdmin)
    );
  }
}
