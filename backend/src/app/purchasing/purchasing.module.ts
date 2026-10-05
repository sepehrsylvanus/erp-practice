import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { InventoryModule } from "../inventory/inventory.module";
import { PurchasingController } from "./purchasing.controller";
import { PurchasingService } from "./purchasing.service";

@Module({
  imports: [AuthModule, AuditModule, InventoryModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
})
export class PurchasingModule {}
