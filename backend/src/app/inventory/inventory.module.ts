import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [InventoryController],
  providers: [InventoryService, PermissionGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
