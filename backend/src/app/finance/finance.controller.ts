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
import { CreateInvoiceDto, CreatePaymentDto } from "./finance.dto";
import { FinanceService } from "./finance.service";

@Controller("finance")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("invpices")
  @Permissions("finance.invoices.read")
  listInvoices(
    @Req() request: AuthenticatedRequest,
    @Query("type") type?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.finance.listInvoices(request.user.companyId, {
      type,
      page,
      pageSize,
    });
  }

  @Post("invpices")
  @Permissions("finance.invoices.post")
  createInvoice(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.finance.createInvoice(
      request.user.companyId,
      request.user.id,
      dto,
    );
  }

  @Post("invoices/:id/issue")
  @Permissions("finance.invoice.post")
  issueInvoice(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.finance.issueInvoice(
      request.user.companyId,
      request.user.id,
      id,
    );
  }

  @Get("payments")
  @Permissions("finance.invoices.read")
  listPayments(
    @Req() request: AuthenticatedRequest,
    @Query("direction") direction?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.finance.listPayments(request.user.companyId, {
      direction,
      page,
      pageSize,
    });
  }

  @Post("payments")
  @Permissions("finance.payments.create")
  createPayment(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.finance.createPayment(
      request.user.companyId,
      request.user.id,
      dto,
    );
  }

  @Get("reports/trial-balance")
  @Permissions("finance.reports.read")
  trialBalance(
    @Req() request: AuthenticatedRequest,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("currency") currency?: string,
  ) {
    return this.finance.trialBalance(
      request.user.companyId,
      from,
      to,
      currency,
    );
  }
}
