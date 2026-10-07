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
import { CreateSalesOrderDto, CreateShipmentDto } from "./sales.dto";
import { SalesService } from "./sales.service";

@Controller("sales/orders")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @Permissions("sales.orders.read")
  list(
    @Req() request: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.sales.list(request.user.companyId, page, pageSize);
  }

  @Post()
  @Permissions("sales.orders.write")
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.sales.create(request.user.companyId, request.user.id, dto);
  }

  @Post(":id/confirm")
  @Permissions("sales.order.approve")
  confirm(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.sales.confirm(request.user.companyId, request.user.id, id);
  }

  @Post(":id/shipments")
  @Permissions("sales.order.approve")
  createShipment(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.sales.createShipment(
      request.user.companyId,
      request.user.id,
      id,
      dto,
    );
  }
}
