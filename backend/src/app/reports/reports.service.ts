import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "@erp/backend-database";

function parseDateRange(from: string, to: string) {
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
    throw new BadRequestException("Report range may not exceed 366 days");
  }
  return { start, end };
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(companyId: string, from: string, to: string) {
    const range = parseDateRange(from, to);
    const [salesOrders, purchaseOrders, invoices, payments] = await Promise.all(
      [
        this.prisma.salesOrder.aggregate({
          where: {
            companyId,
            orderDate: { gte: range.start, lte: range.end },
            status: { in: ["CONFIRMED", "PARTIALLY_SHIPPED", "SHIPPED"] },
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.purchaseOrder.count({
          where: {
            companyId,
            orderDate: { gte: range.start, lte: range.end },
            status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"] },
          },
        }),
        this.prisma.invoice.aggregate({
          where: {
            companyId,
            issueDate: { gte: range.start, lte: range.end },
            status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: { companyId, paidAt: { gte: range.start, lte: range.end } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ],
    );
    return {
      data: {
        salesOrderCount: salesOrders._count._all,
        salesOrderTotal: salesOrders._sum.totalAmount?.toString() ?? "0.00",
        purchaseOrderCount: purchaseOrders,
        invoiceCount: invoices._count._all,
        invoiceTotal: invoices._sum.totalAmount?.toString() ?? "0.00",
        paymentCount: payments._count._all,
        paymentTotal: payments._sum.amount?.toString() ?? "0.00",
        from,
        to,
      },
    };
  }

  async sales(companyId: string, from: string, to: string, groupBy = "day") {
    if (!["day", "month"].includes(groupBy)) {
      throw new BadRequestException("groupBy must be day or month");
    }
    const range = parseDateRange(from, to);
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        companyId,
        orderDate: { gte: range.start, lte: range.end },
        status: { in: ["CONFIRMED", "PARTIALLY_SHIPPED", "SHIPPED"] },
      },
      select: {
        id: true,
        number: true,
        orderDate: true,
        currency: true,
        totalAmount: true,
      },
      orderBy: { orderDate: "asc" },
      take: 10000,
    });

    const groups = new Map<
      string,
      { period: string; count: number; total: Decimal; currency: string }
    >();
    for (const order of orders) {
      const day = dateOnly(order.orderDate);
      const key = groupBy === "month" ? day.slice(0, 7) : day;
      const groupKey = `${key}|${order.currency}`;
      const current = groups.get(groupKey) ?? {
        period: key,
        count: 0,
        total: new Decimal(0),
        currency: order.currency,
      };
      current.count += 1;
      current.total = current.total.plus(order.totalAmount.toString());
      groups.set(groupKey, current);
    }
    const data = [...groups.values()].map((item) => ({
      period: item.period,
      orderCount: item.count,
      total: item.total.toFixed(2),
      currency: item.currency,
    }));
    return { data, meta: { from, to, groupBy, truncatedAt: 10000 } };
  }

  async stockValuation(companyId: string, warehouseId?: string) {
    if (warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
        select: { id: true },
      });
      if (!warehouse)
        throw new NotFoundException("Warehouse not found in this company");
    }
    const balances = await this.prisma.stockBalance.findMany({
      where: { companyId, ...(warehouseId ? { warehouseId } : {}) },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            purchasePrice: true,
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ warehouseId: "asc" }, { productId: "asc" }],
      take: 10000,
    });
    let total = new Decimal(0);
    const data = balances.map((balance) => {
      const quantity = new Decimal(balance.onHand.toString());
      const unitCost = new Decimal(
        balance.product.purchasePrice?.toString() ?? "0",
      );
      const value = quantity.mul(unitCost).toDecimalPlaces(2);
      total = total.plus(value);
      return {
        warehouse: balance.warehouse,
        product: {
          id: balance.product.id,
          sku: balance.product.sku,
          name: balance.product.name,
          unit: balance.product.unit,
        },
        onHand: quantity.toFixed(3),
        unitCost: unitCost.toFixed(2),
        estimatedValue: value.toFixed(2),
      };
    });
    return {
      data,
      meta: {
        totalEstimatedValue: total.toFixed(2),
        method: "onHand x product.purchasePrice",
      },
    };
  }

  async arAging(companyId: string, asOfValue: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfValue)) {
      throw new BadRequestException("asOf must use YYYY-MM-DD");
    }
    const asOf = new Date(`${asOfValue}T23:59:59.999Z`);
    if (!Number.isFinite(asOf.getTime()))
      throw new BadRequestException("Invalid asOf date");

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        type: "SALES",
        status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        issueDate: { lte: asOf },
      },
      select: {
        id: true,
        number: true,
        customerId: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        customer: { select: { code: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10000,
    });
    const bucketNames = [
      "current",
      "days1to30",
      "days31to60",
      "days61to90",
      "over90",
    ] as const;
    const totals = Object.fromEntries(
      bucketNames.map((name) => [name, new Decimal(0)]),
    ) as Record<(typeof bucketNames)[number], Decimal>;
    const rows = invoices.flatMap((invoice) => {
      const due = new Decimal(invoice.totalAmount.toString()).minus(
        invoice.paidAmount.toString(),
      );
      if (!due.greaterThan(0)) return [];
      const dueDate = invoice.dueDate ?? invoice.issueDate ?? asOf;
      const daysPastDue = Math.max(
        0,
        Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000),
      );
      const bucket =
        daysPastDue === 0
          ? "current"
          : daysPastDue <= 30
            ? "days1to30"
            : daysPastDue <= 60
              ? "days31to60"
              : daysPastDue <= 90
                ? "days61to90"
                : "over90";
      totals[bucket] = totals[bucket].plus(due);
      return [
        {
          invoiceId: invoice.id,
          number: invoice.number,
          customer: invoice.customer,
          dueDate: dateOnly(dueDate),
          daysPastDue,
          outstanding: due.toFixed(2),
          currency: invoice.currency,
          bucket,
        },
      ];
    });
    return {
      data: rows,
      meta: {
        asOf: asOfValue,
        totals: Object.fromEntries(
          bucketNames.map((name) => [name, totals[name].toFixed(2)]),
        ),
        totalOutstanding: bucketNames
          .reduce((sum, name) => sum.plus(totals[name]), new Decimal(0))
          .toFixed(2),
      },
    };
  }
}
