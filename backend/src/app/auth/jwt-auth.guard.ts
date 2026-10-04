import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@erp/backend-database";
import type { Request } from "express";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

type RequestWithOptionalUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOptionalUser>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer access token is required");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        authorization.slice(7).trim(),
      );
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.companyId !== "string"
    ) {
      throw new UnauthorizedException("Access token is invalid");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        roleAssignments: {
          where: { role: { companyId: payload.companyId } },
          select: {
            role: {
              select: {
                code: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                permissions: { select: { permissionCode: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || user.roleAssignments.length === 0) {
      throw new UnauthorizedException(
        "User or company access is no longer active",
      );
    }

    const company = user.roleAssignments[0]?.role.company;
    if (!company || company.id !== payload.companyId) {
      throw new UnauthorizedException("User has no access to this company");
    }

    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      companyId: company.id,
      companyName: company.name,
      roles: Array.from(
        new Set(user.roleAssignments.map(({ role }) => role.code)),
      ).sort(),
      permissions: Array.from(
        new Set(
          user.roleAssignments.flatMap(({ role }) =>
            role.permissions.map(({ permissionCode }) => permissionCode),
          ),
        ),
      ).sort(),
    };

    return true;
  }
}
