import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "./permissions.decorator";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Observable } from "rxjs";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      !request.user ||
      !required.every((permission) =>
        request.user.permissions.includes(permission),
      )
    ) {
      throw new ForbiddenException("Missing required permission");
    }

    return true;
  }
}
