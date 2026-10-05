import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { AdjustStockDto } from "./inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("balances")
  @Permissions("inventory.balance.read")
  balances(
    @Req() request: AuthenticatedRequest,
    @Query("warehouseId") warehouseId?: string,
    @Query("productId") productId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.inventory.balances(request.user.companyId, {
      warehouseId,
      productId,
      page,
      pageSize,
    });
  }

  @Get("movements")
  @Permissions("inventory.balance.read")
  movements(
    @Req() request: AuthenticatedRequest,
    @Query("warehouseId") warehouseId?: string,
    @Query("productId") productId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    this.inventory.movements(request.user.companyId, {
      warehouseId,
      productId,
      page,
      pageSize,
    });
  }

  @Post("adjustments")
  @Permissions("inventory.adjust")
  adjust(
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventory.adjust(
      request.user.companyId,
      request.user.id,
      dto,
      idempotencyKey,
    );
  }
}
