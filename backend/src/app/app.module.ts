import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "@erp/backend-database";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { CatalogModule } from "./catalog/catalog.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PurchasingModule } from "./purchasing/purchasing.module";
import { SalesModule } from "./sales/sales.module";
import { FinanceModule } from "./finance/finance.module";
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    CatalogModule,
    InventoryModule,
    PurchasingModule,
    SalesModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
