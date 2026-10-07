import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "@erp/backend-database";
import { AuditService } from "../audit/audit.service";
import { getPagination } from "../common/pagination";
import { CreateInvoiceDto, CreatePaymentDto } from "./finance.dto";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function dateRange(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new BadRequestException("Dates must use YYYY-MM-DD");
  }

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end
  ) {
    throw new BadRequestException("Invalid date range");
  }
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new BadRequestException(
      "A trial-balance range may not exceed 366 days",
    );
  }

  return { start, end };
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listInvoices(
    companyId: string,
    query: { type?: string; page?: string; pageSize?: string },
  ) {
    if (query.type && !["SALES", "PURCHASE"].includes(query.type)) {
      throw new BadRequestException("type must be SALES or PURCHASE");
    }

    const pagination = getPagination(query.page, query.pageSize);
    const where = {
      companyId,
      ...(query.type ? { type: query.type as "SALES" | "PURCHASE" } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          lines: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createInvoice(
    companyId: string,
    actorId: string,
    dto: CreateInvoiceDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultCurrency: true },
    });

    if (!company) throw new NotFoundException("Company not found");
    if (dto.currency !== company.defaultCurrency) {
      throw new BadRequestException(
        "This MVP accepts the company's default currency only",
      );
    }

    let customerId: string | null = null;
    let supplierId: string | null = null;
    let salesOrderId: string | null = null;
    let purchaseOrderId: string | null = null;
    let currency = dto.currency;
    let sourceLines: Array<{
      productId: string;
      description: string;
      quantity: string;
      unitPrice: string;
      taxRate: string;
      netAmount: string;
      taxAmount: string;
      totalAmount: string;
    }>;
    let netAmount: string;
    let taxAmount: string;
    let totalAmount: string;

    if (dto.type === "SALES") {
      if (!dto.salesOrderId || dto.purchaseOrderId) {
        throw new BadRequestException(
          "A sales invoice requires salesOrderId only",
        );
      }
      const order = await this.prisma.salesOrder.findFirst({
        where: { id: dto.salesOrderId, companyId },
        include: { lines: true },
      });

      if (!order) throw new NotFoundException("Sales order not found");

      if (!["SHIPPED", "PARTIALLY_SHIPPED"].includes(order.status)) {
        throw new ConflictException(
          "Issue/ship the sales order before creating its invoice",
        );
      }
      if (
        order.currency !== dto.currency ||
        (dto.customerId && dto.customerId !== order.customerId)
      ) {
        throw new BadRequestException(
          "Invoice customer/currency must match the sales order",
        );
      }
      salesOrderId = order.id;
      customerId = order.customerId;
      currency = order.currency;
      sourceLines = order.lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        taxRate: line.taxRate.toString(),
        netAmount: line.netAmount.toString(),
        taxAmount: line.taxAmount.toString(),
        totalAmount: line.totalAmount.toString(),
      }));
      netAmount = order.netAmount.toString();
      taxAmount = order.taxAmount.toString();
      totalAmount = order.totalAmount.toString();
    } else {
      if (!dto.purchaseOrderId || dto.salesOrderId) {
        throw new BadRequestException(
          "A purchase invoice requires purchaseOrderId only",
        );
      }
      const order = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException("Purchase order not found");
      if (!["PARTIALLY_RECEIVED", "RECEIVED"].includes(order.status)) {
        throw new ConflictException(
          "Receive goods before creating the supplier invoice",
        );
      }
      if (
        order.currency !== dto.currency ||
        (dto.supplierId && dto.supplierId !== order.supplierId)
      ) {
        throw new BadRequestException(
          "Invoice supplier/currency must match the purchase order",
        );
      }

      purchaseOrderId = order.id;
      supplierId = order.supplierId;
      currency = order.currency;
      sourceLines = order.lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitCost.toString(),
        taxRate: line.taxRate.toString(),
        netAmount: line.netAmount.toString(),
        taxAmount: line.taxAmount.toString(),
        totalAmount: line.totalAmount.toString(),
      }));
      netAmount = order.netAmount.toString();
      taxAmount = order.taxAmount.toString();
      totalAmount = order.totalAmount.toString();
    }

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          companyId,
          type: dto.type,
          salesOrderId,
          purchaseOrderId,
          customerId,
          supplierId,
          number: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
          currency,
          ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
          ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
          netAmount,
          taxAmount,
          totalAmount,
          lines: {
            create: sourceLines.map((line) => ({
              ...line,
              quantity: new Decimal(line.quantity).toFixed(3),
              unitPrice: new Decimal(line.unitPrice).toFixed(2),
              taxRate: new Decimal(line.taxRate).toFixed(2),
              netAmount: new Decimal(line.netAmount).toFixed(2),
              taxAmount: new Decimal(line.taxAmount).toFixed(2),
              totalAmount: new Decimal(line.totalAmount).toFixed(2),
            })),
          },
        },
        include: { lines: true },
      });

      await this.audit.write({
        companyId,
        actorId,
        action: "finance.invoice.created",
        entityType: "Invoice",
        entityId: invoice.id,
      });
      return { data: invoice };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Invoice number already exists");
      throw error;
    }
  }

  async issueInvoice(companyId: string, actorId: string, id: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findFirst({
          where: { id, companyId },
          include: { lines: true },
        });

        if (!invoice) throw new NotFoundException("Invoice not found");
        if (invoice.status !== "DRAFT") {
          throw new ConflictException("Only a draft invoice can be issued");
        }

        const isSales = invoice.type === "SALES";
        const accountCodes = isSales
          ? ["1100", "4000", "2100"]
          : ["1200", "1300", "2000"];
        const accounts = await tx.account.findMany({
          where: { companyId, code: { in: accountCodes }, isActive: true },
        });
        const accountByCode = new Map(
          accounts.map((account) => [account.code, account]),
        );

        const requiredCodes = new Decimal(invoice.taxAmount.toString()).isZero()
          ? accountCodes.filter((code) => code !== (isSales ? "2100" : "1300"))
          : accountCodes;

        for (const code of requiredCodes) {
          if (!accountByCode.has(code)) {
            throw new BadRequestException(
              `Required active ledger account ${code} is missing`,
            );
          }
        }

        const total = new Decimal(invoice.totalAmount.toString());
        const net = new Decimal(invoice.netAmount.toString());
        const tax = new Decimal(invoice.taxAmount.toString());

        if (!total.greaterThan(0) || !net.plus(tax).equals(total)) {
          throw new BadRequestException(
            "Invoice amounts are invalid or do not balance",
          );
        }

        const entries = isSales
          ? [
              {
                code: "1100",
                description: "Accounts receivable",
                debit: total,
                credit: new Decimal(0),
              },
              {
                code: "4000",
                description: "Sales revenue",
                debit: new Decimal(0),
                credit: net,
              },
              ...(tax.isZero()
                ? []
                : [
                    {
                      code: "2100",
                      description: "Output VAT payable",
                      debit: new Decimal(0),
                      credit: tax,
                    },
                  ]),
            ]
          : [
              {
                code: "1200",
                description: "Inventory / expense",
                debit: net,
                credit: new Decimal(0),
              },
              ...(tax.isZero()
                ? []
                : [
                    {
                      code: "1300",
                      description: "Input VAT receivable",
                      debit: tax,
                      credit: new Decimal(0),
                    },
                  ]),
              {
                code: "2000",
                description: "Accounts payable",
                debit: new Decimal(0),
                credit: total,
              },
            ];

        const debitTotal = entries.reduce(
          (sum, line) => sum.plus(line.debit),
          new Decimal(0),
        );
        const creditTotal = entries.reduce(
          (sum, line) => sum.plus(line.credit),
          new Decimal(0),
        );
        if (!debitTotal.equals(creditTotal))
          throw new BadRequestException("Journal is not balanced");

        const journal = await tx.journalEntry.create({
          data: {
            companyId,
            number: `JRN-${randomUUID().slice(0, 8).toUpperCase()}`,
            entryDate: invoice.issueDate ?? new Date(),
            status: "POSTED",
            sourceType: isSales ? "INVOICE_SALES" : "INVOICE_PURCHASE",
            sourceId: invoice.id,
            memo: `Issue invoice ${invoice.number}`,
            postedAt: new Date(),
            lines: {
              create: entries.map((line, index) => ({
                accountId: accountByCode.get(line.code)!.id,
                lineNumber: index + 1,
                description: line.description,
                debit: line.debit.toFixed(2),
                credit: line.credit.toFixed(2),
              })),
            },
          },
          include: { lines: true },
        });
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "ISSUED",
            issueDate: invoice.issueDate ?? new Date(),
          },
        });
        return { invoice: updatedInvoice, journal };
      },
      { isolationLevel: "Serializable" },
    );

    await this.audit.write({
      companyId,
      actorId,
      action: "finance.invoice.issued",
      entityType: "Invoice",
      entityId: id,
    });

    return { data: result };
  }

  async listPayments(
    companyId: string,
    query: { direction?: string; page?: string; pageSize?: string },
  ) {
    if (
      query.direction &&
      !["INCOMING", "OUTGOING"].includes(query.direction)
    ) {
      throw new BadRequestException("direction must be INCOMING or OUTGOING");
    }
    const pagination = getPagination(query.page, query.pageSize);
    const where = {
      companyId,
      ...(query.direction
        ? { direction: query.direction as "INCOMING" | "OUTGOING" }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true } },
          allocations: {
            include: {
              invoice: { select: { id: true, number: true, type: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createPayment(
    companyId: string,
    actorId: string,
    dto: CreatePaymentDto,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultCurrency: true },
    });
    if (!company) throw new NotFoundException("Company not found");
    if (dto.currency !== company.defaultCurrency) {
      throw new BadRequestException(
        "This MVP accepts the company's default currency only",
      );
    }
    if (
      new Set(dto.allocations.map((allocation) => allocation.invoiceId))
        .size !== dto.allocations.length
    ) {
      throw new BadRequestException(
        "Each invoice may appear only once in a payment",
      );
    }
    const amount = new Decimal(dto.amount);
    const allocationTotal = dto.allocations.reduce(
      (sum, allocation) => sum.plus(allocation.amount),
      new Decimal(0),
    );
    if (!amount.greaterThan(0) || !allocationTotal.equals(amount)) {
      throw new BadRequestException(
        "Payment amount must equal the sum of allocations",
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const invoices = await tx.invoice.findMany({
          where: {
            companyId,
            id: {
              in: dto.allocations.map((allocation) => allocation.invoiceId),
            },
          },
        });
        if (invoices.length !== dto.allocations.length) {
          throw new NotFoundException(
            "One or more invoices were not found in this company",
          );
        }
        const invoiceById = new Map(
          invoices.map((invoice) => [invoice.id, invoice]),
        );
        let partyId: string | null = null;
        for (const allocation of dto.allocations) {
          const invoice = invoiceById.get(allocation.invoiceId)!;
          const expectedType =
            dto.direction === "INCOMING" ? "SALES " : "PURCHASE";
          if (
            invoice.type !== expectedType ||
            !["ISSUED", "PARTIALLY_PAID"].includes(invoice.status)
          ) {
            throw new ConflictException(
              "Payment direction or invoice status does not match",
            );
          }
          if (invoice.currency !== dto.currency)
            throw new BadRequestException(
              "Payment currency differs from invoice",
            );
          const due = new Decimal(invoice.totalAmount.toString()).minus(
            invoice.paidAmount.toString(),
          );
          if (
            !new Decimal(allocation.amount).greaterThan(0) ||
            new Decimal(allocation.amount).greaterThan(due)
          ) {
            throw new ConflictException(
              "Allocation exceeds the invoice outstanding amount",
            );
          }
          const currentPartyId =
            dto.direction === "INCOMING"
              ? invoice.customerId
              : invoice.supplierId;
          if (!currentPartyId || (partyId && partyId !== currentPartyId)) {
            throw new BadRequestException(
              "All allocated invoices must belong to the same customer or supllier",
            );
          }
          partyId = currentPartyId;
        }
        const payment = await tx.payment.create({
          data: {
            companyId,
            createdById: actorId,
            direction: dto.direction,
            method: dto.method,
            reference: dto.reference ?? null,
            amount: amount.toFixed(2),
            currency: dto.currency,
            ...(dto.direction === "INCOMING"
              ? { customerId: partyId }
              : { supplierId: partyId }),
            allocations: {
              create: dto.allocations.map((allocation) => ({
                invoiceId: allocation.invoiceId,
                amount: new Decimal(allocation.amount).toFixed(2),
              })),
            },
          },
          include: { allocations: true },
        });

        for (const allocation of dto.allocations) {
          const invoice = invoiceById.get(allocation.invoiceId)!;
          const paidAmount = new Decimal(invoice.paidAmount.toString());
          const fullyPaid = paidAmount.greaterThanOrEqualTo(
            invoice.totalAmount.toString(),
          );
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: paidAmount.toFixed(2),
              status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
            },
          });
        }

        const debitCode = dto.direction === "INCOMING" ? "1000" : "2000";
        const creditCode = dto.direction === "INCOMING" ? "1100" : "1000";
        const accounts = await tx.account.findMany({
          where: {
            companyId,
            code: { in: [debitCode, creditCode] },
            isActive: true,
          },
        });

        const accountByCode = new Map(
          accounts.map((account) => [account.code, account]),
        );
        if (!accountByCode.has(debitCode) || !accountByCode.has(creditCode)) {
          throw new BadRequestException(
            "Cash/receivable/payable ledger account is missing",
          );
        }

        const journal = await tx.journalEntry.create({
          data: {
            companyId,
            number: `JRN-${randomUUID().slice(0, 8).toUpperCase()}`,
            entryDate: new Date(),
            status: "POSTED",
            sourceType: "PAYMENT",
            sourceId: payment.id,
            memo: `Payment ${payment.reference ?? payment.id}`,
            postedAt: new Date(),
            lines: {
              create: [
                {
                  accountId: accountByCode.get(debitCode)!.id,
                  lineNumber: 1,
                  description:
                    dto.direction === "INCOMING"
                      ? "Cash received"
                      : "Supplier payable",
                  debit: amount.toFixed(2),
                  credit: "0.00",
                },
                {
                  accountId: accountByCode.get(creditCode)!.id,
                  lineNumber: 2,
                  description:
                    dto.direction === "INCOMING"
                      ? "Accounts receivable"
                      : "Cash paid",
                  debit: "0.00",
                  credit: amount.toFixed(2),
                },
              ],
            },
          },
          include: { lines: true },
        });
        return { payment, journal };
      },
      { isolationLevel: "Serializable" },
    );

    await this.audit.write({
      companyId,
      actorId,
      action: "finance.payment.created",
      entityType: "Payment",
      entityId: result.payment.id,
    });
    return { data: result };
  }

  async trialBalance(
    companyId: string,
    from: string,
    to: string,
    currency?: string,
  ) {
    const { start, end } = dateRange(from, to);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultCurrency: true },
    });
    if (!company) throw new NotFoundException("Company not found");
    if (currency && currency !== company.defaultCurrency) {
      throw new BadRequestException(
        "This MVP trial balance is in the company default currency only",
      );
    }
    const lines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          is: {
            companyId,
            status: "POSTED",
            entryDate: { gte: start, lte: end },
          },
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: [{ account: { code: "asc" } }, { lineNumber: "asc" }],
    });
    const totals = new Map<
      string,
      {
        account: (typeof lines)[number]["account"];
        debit: Decimal;
        credit: Decimal;
      }
    >();
    for (const line of lines) {
      const current = totals.get(line.accountId) ?? {
        account: line.account,
        debit: new Decimal(0),
        credit: new Decimal(0),
      };
      current.debit = current.debit.plus(line.debit.toString());
      current.credit = current.credit.plus(line.credit.toString());
      totals.set(line.accountId, current);
    }
    const data = [...totals.values()].map((item) => ({
      ...item.account,
      debit: item.debit.toFixed(2),
      credit: item.credit.toFixed(2),
      netDebit: item.debit.minus(item.credit).toFixed(2),
    }));
    const debitTotal = data.reduce(
      (sum, line) => sum.plus(line.debit),
      new Decimal(0),
    );
    const creditTotal = data.reduce(
      (sum, line) => sum.plus(line.credit),
      new Decimal(0),
    );
    if (!debitTotal.equals(creditTotal))
      throw new ConflictException("Posted ledger is out of balance");
    return {
      data,
      meta: {
        from,
        to,
        currency: company.defaultCurrency,
        debitTotal: debitTotal.toFixed(2),
        creditTotal: creditTotal.toFixed(2),
      },
    };
  }
}
