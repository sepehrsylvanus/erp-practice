import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionGuard)
@Permissions("finance.reports.read")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("overview")
  overview(
    @Req() request: AuthenticatedRequest,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.reports.overview(request.user.companyId, from, to);
  }

  @Get("sales")
  sales(
    @Req() request: AuthenticatedRequest,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("groupBy") groupBy = "day",
  ) {
    return this.reports.sales(request.user.companyId, from, to, groupBy);
  }

  @Get("stock-valuation")
  stockValuation(
    @Req() request: AuthenticatedRequest,
    @Query("warehouseId") warehouseId?: string,
  ) {
    return this.reports.stockValuation(request.user.companyId, warehouseId);
  }

  @Get("ar-aging")
  arAging(@Req() request: AuthenticatedRequest, @Query("asOf") asOf: string) {
    return this.reports.arAging(request.user.companyId, asOf);
  }
}
