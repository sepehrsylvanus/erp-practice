import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { PermissionGuard } from "../common/permission.guard";
@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditService, JwtAuthGuard, PermissionGuard],
  exports: [AuditService],
})
export class AuditModule {}
