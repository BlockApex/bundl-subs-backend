import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "src/user/schemas/user.schema";

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request["user"] as User;
  },
);
