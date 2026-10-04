import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { CreateProductDto, UpdateProductDto } from "./catalog.dto";
import { ProductsService } from "./products.service";
@Controller("products")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Permissions("catalog.products.read")
  list(
    @Req() request: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
  ) {
    return this.products.list(request.user.companyId, {
      page,
      pageSize,
      search,
    });
  }

  @Post()
  @Permissions("catalog.products.write")
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateProductDto) {
    return this.products.create(request.user.companyId, request.user.id, dto);
  }

  @Patch(":id")
  @Permissions("catalog.products.write")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(
      request.user.companyId,
      request.user.id,
      id,
      dto,
    );
  }
}
