import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { FinanceController } from "./finance.controller";

import { FinanceService } from "./finance.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [FinanceController],

  providers: [FinanceService, PermissionGuard],
})
export class FinanceModule {}
