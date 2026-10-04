import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "@erp/backend-database";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { CatalogModule } from "./catalog/catalog.module";
@Module({
  imports: [PrismaModule, AuthModule, AuditModule, CatalogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
