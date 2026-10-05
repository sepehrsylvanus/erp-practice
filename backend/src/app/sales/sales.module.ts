import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { InventoryModule } from "../inventory/inventory.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [AuthModule, AuditModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, PermissionGuard],
})
export class SalesModule {}
