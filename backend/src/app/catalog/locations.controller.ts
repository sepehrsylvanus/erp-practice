import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { LocationsService } from "./locations.service";
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get("branches")
  @Permissions("catalog.locations.read")
  branches(@Req() request: AuthenticatedRequest) {
    return this.locations.branches(request.user.companyId);
  }

  @Get("warehouses")
  @Permissions("catalog.locations.read")
  warehouses(@Req() request: AuthenticatedRequest) {
    return this.locations.warehouses(request.user.companyId);
  }
}
