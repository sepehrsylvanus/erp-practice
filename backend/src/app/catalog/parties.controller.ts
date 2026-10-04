import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { PermissionGuard } from "../common/permission.guard";
import { Permissions } from "../common/permissions.decorator";
import { CreatePartyDto } from "./catalog.dto";
import { PartiesService } from "./parties.service";
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Get("customers")
  @Permissions("catalog.parties.read")
  listCustomers(
    @Req() request: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.parties.listCustomers(request.user.companyId, page, pageSize);
  }

  @Post("customers")
  @Permissions("catalog.parties.write")
  createCustomer(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePartyDto,
  ) {
    return this.parties.createCustomer(
      request.user.companyId,
      request.user.id,
      dto,
    );
  }

  @Get("suppliers")
  @Permissions("catalog.parties.read")
  listSuppliers(
    @Req() request: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.parties.listSuppliers(request.user.companyId, page, pageSize);
  }

  @Post("suppliers")
  @Permissions("catalog.parties.write")
  createSupplier(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePartyDto,
  ) {
    return this.parties.createSupplier(
      request.user.companyId,
      request.user.id,
      dto,
    );
  }
}
