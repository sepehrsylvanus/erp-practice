import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, PermissionGuard],
})
export class ReportsModule {}
