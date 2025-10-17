import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { User } from "src/user/schemas/user.schema";
import { AuthGuard } from "./auth.guard";

@Injectable()
export class AdminGuard extends AuthGuard implements CanActivate {
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
        return this.checkAdminRole(context);
      });
    }

    return this.checkAdminRole(context);
  }

  private checkAdminRole(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request["user"] as User;

    if (!user || !user.isAdmin) {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
