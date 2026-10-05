import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from "./purchasing.dto";
import { PurchasingService } from "./purchasing.service";

@Controller("purchasing/orders")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}
  @Get()
  @Permissions("purchasing.orders.read")
  list(
    @Req() request: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.purchasing.list(request.user.companyId, page, pageSize);
  }

  @Post()
  @Permissions("purchasing.orders.write")
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasing.create(request.user.companyId, request.user.id, dto);
  }

  @Post(":id/approve")
  @Permissions("purchasing.orders.approve")
  approve(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.purchasing.approve(request.user.companyId, request.user.id, id);
  }

  @Post(":id/receipts")
  @Permissions("purchasing.orders.write")
  receive(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasing.receive(
      request.user.companyId,
      request.user.id,
      id,
      dto,
    );
  }
}
