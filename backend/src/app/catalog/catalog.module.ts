import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { PermissionGuard } from "../common/permission.guard";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import { PartiesController } from "./parties.controller";
import { PartiesService } from "./parties.service";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ProductsController, PartiesController, LocationsController],
  providers: [ProductsService, PartiesService, LocationsService],
})
export class CatalogModule {}
