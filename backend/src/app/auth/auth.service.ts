import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaClient } from "../../../../libs/backend/database/src/generated/client/client";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";
import { verify } from "argon2";
import { AuthenticatedUser, CompanyContext } from "./auth.types";
import { createHmac, randomBytes } from "crypto";
import { REFRESH_TTL_MS } from "./auth.constants";
import { emitWarning } from "process";
import { subscribe } from "diagnostics_channel";
type RoleAssignmentForAuth = {
  role: {
    code: string;
    company: { id: string; name: string };
    permissions: Array<{ permissionCode: string }>;
  };
};

type UserForAuth = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  passwordHash: string;
  roleAssignments: RoleAssignmentForAuth[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                company: { select: { id: true, name: true } },
                permissions: { select: { permissionCode: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    let passwordMatches = false;
    try {
      passwordMatches = await verify(user.passwordHash, dto.password);
    } catch (error) {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const contexts = this.toCompanyContexts(user.roleAssignments);
    if (contexts.length === 0) {
      throw new ForbiddenException(
        "No company access is assigned to this user",
      );
    }

    const company = dto.companyId
      ? contexts.find((context) => context.id === dto.companyId)
      : contexts[0];

    if (!company) {
      throw new ForbiddenException(
        "This user has no access to the selected company",
      );
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      companyId: company.id,
    });
    const refreshToken = this.createRefreshToken(company.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.create({
        data: {
          userId: user.id,
          tokenHash: this.hashRefreshToken(refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actorId: user.id,
          action: "auth.login",
          entityType: "User",
          entityId: user.id,
        },
      });
    });

    return {
      accessToken,
      refreshToken,
      user: this.toAuthenticatedUser(user, company),
      companies: contexts.map(({ id, name }) => ({ id, name })),
    };
  }

  async refresh(rawToken?: string) {
    if (!rawToken || rawToken.length > 512) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const companyId = this.companyIdFromRefreshToken(rawToken);
    const tokenHash = this.hashRefreshToken(rawToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  include: {
                    company: { select: { id: true, name: true } },
                    permissions: { select: { permissionCode: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException("Refresh token is invalid");
    }
    const now = new Date();
    if (session.revokedAt) {
      await this.prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      throw new UnauthorizedException("Refresh token is invalid");
    }

    if (session.expiresAt <= now || !session.user.isActive) {
      await this.prisma.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      throw new UnauthorizedException("Refresh token is expired or invalid");
    }

    const contexts = this.toCompanyContexts(session.user.roleAssignments);
    const company = contexts.find((context) => context.id === companyId);
    if (!company) {
      await this.prisma.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      throw new UnauthorizedException("Refresh token is invalid");
    }

    const accessToken = await this.jwt.signAsync({
      sub: session.user.id,
      companyId: company.id,
    });
    const nextRefreshToken = this.createRefreshToken(company.id);
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException("Refresh token was already used");
      }

      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: this.hashRefreshToken(nextRefreshToken),
          expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
        },
      });
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: this.toAuthenticatedUser(session.user, company),
      companies: contexts.map(({ id, name }) => ({ id, name })),
    };
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken || rawToken.length > 512) return;
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash: this.hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toCompanyContexts(
    assignments: RoleAssignmentForAuth[],
  ): CompanyContext[] {
    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        roles: Set<string>;
        permissions: Set<string>;
      }
    >();

    for (const assignment of assignments) {
      const role = assignment.role;
      const context = grouped.get(role.company.id) ?? {
        id: role.company.id,
        name: role.company.name,
        roles: new Set<string>(),
        permissions: new Set<string>(),
      };
      context.roles.add(role.code);
      for (const permission of role.permissions) {
        context.permissions.add(permission.permissionCode);
      }
      grouped.set(role.company.id, context);
    }

    return Array.from(grouped.values())
      .map((context) => ({
        id: context.id,
        name: context.name,
        roles: Array.from(context.roles).sort(),
        permissions: Array.from(context.permissions).sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private createRefreshToken(companyId: string): string {
    return `${companyId}.${randomBytes(32).toString("base64url")}`;
  }

  private hashRefreshToken(rawToken: string): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("JWT_REFRESH_SECRET must contain at least 32 characters");
    }

    return createHmac("sha256", secret).update(rawToken).digest("hex");
  }

  private toAuthenticatedUser(
    user: Pick<UserForAuth, "id" | "email" | "displayName">,
    company: CompanyContext,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      companyId: company.id,
      companyName: company.name,
      roles: company.roles,
      permissions: company.permissions,
    };
  }

  private companyIdFromRefreshToken(rawToken: string): string {
    const separator = rawToken.indexOf(".");
    if (separator < 1 || separator === rawToken.length - 1) {
      throw new UnauthorizedException("Refresh token is invalid");
    }

    return rawToken.slice(0, separator);
  }
}
