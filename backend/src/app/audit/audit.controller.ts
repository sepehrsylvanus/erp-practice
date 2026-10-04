import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions("admin.users.manage")
  list(
    @Req() request: AuthenticatedRequest,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.audit.list(request.user.companyId, {
      entityType,
      entityId,
      page,
      pageSize,
    });
  }
}
