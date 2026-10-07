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
import { InventoryService } from "../inventory/inventory.service";
import { CreateSalesOrderDto, CreateShipmentDto } from "./sales.dto";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async list(companyId: string, page?: string, pageSize?: string) {
    const pagination = getPagination(page, pageSize);
    const where = { companyId };
    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async create(companyId: string, actorId: string, dto: CreateSalesOrderDto) {
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

    const [customer, branch, warehouse] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId, isActive: true },
      }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, companyId } }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId, isActive: true },
      }),
    ]);
    if (
      !customer ||
      !branch ||
      !warehouse ||
      warehouse.branchId !== branch.id
    ) {
      throw new BadRequestException(
        "Customer, branch and warehouse must belong to this company",
      );
    }
    const productIds = [...new Set(dto.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, id: { in: productIds } },
      select: { id: true, name: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(
        "One or more products are not in this company",
      );
    }
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const lines = dto.lines.map((line) => {
      const quantity = new Decimal(line.quantity);
      const unitPrice = new Decimal(line.unitPrice);
      const taxRate = new Decimal(line.taxRate ?? "0");
      if (
        !quantity.greaterThan(0) ||
        !taxRate.isFinite() ||
        taxRate.greaterThan(100)
      ) {
        throw new BadRequestException("Quantity or tax rate is invalid");
      }
      const netAmount = quantity.mul(unitPrice).toDecimalPlaces(2);
      const taxAmount = netAmount.mul(taxRate).div(100).toDecimalPlaces(2);
      return {
        productId: line.productId,
        description: line.description ?? productById.get(line.productId)!.name,
        quantity: quantity.toFixed(3),
        unitPrice: unitPrice.toFixed(2),
        taxRate: taxRate.toFixed(2),
        netAmount: netAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: netAmount.plus(taxAmount).toFixed(2),
        _net: netAmount,
        _tax: taxAmount,
      };
    });
    const netAmount = lines.reduce(
      (sum, line) => sum.plus(line._net),
      new Decimal(0),
    );
    const taxAmount = lines.reduce(
      (sum, line) => sum.plus(line._tax),
      new Decimal(0),
    );
    const number = `SO-${randomUUID().slice(0, 8).toUpperCase()}`;

    try {
      const order = await this.prisma.salesOrder.create({
        data: {
          companyId,
          customerId: customer.id,
          branchId: branch.id,
          warehouseId: warehouse.id,
          createdById: actorId,
          number,
          currency: dto.currency,
          netAmount: netAmount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: netAmount.plus(taxAmount).toFixed(2),
          lines: { create: lines.map(({ _net, _tax, ...line }) => line) },
        },
        include: { lines: true },
      });
      await this.audit.write({
        companyId,
        actorId,
        action: "sales.order.created",
        entityType: "SalesOrder",
        entityId: order.id,
      });
      return { data: order };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Sales order number is already exists");
      throw error;
    }
  }

  async confirm(companyId: string, actorId: string, id: string) {
    const order = await this.prisma.$transaction(
      async (tx) => {
        const found = await tx.salesOrder.findFirst({
          where: { id, companyId },
          include: {
            lines: { include: { product: { select: { trackStock: true } } } },
          },
        });
        if (!found) throw new NotFoundException("Sales order not found");
        if (found.status !== "DRAFT") {
          throw new ConflictException(
            "Only a draft sales order can be confirmed",
          );
        }
        for (const line of found.lines) {
          if (!line.product.trackStock) continue;
          await this.inventory.reserveStock(tx, {
            companyId,
            warehouseId: found.warehouseId,
            productId: line.productId,
            salesOrderLineId: line.id,
            quantity: line.quantity.toString(),
            idempotencyKey: `sales-order:${line.id}:reserve`,
          });
          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { reservedQuantity: line.quantity },
          });
        }
        return tx.salesOrder.update({
          where: { id: found.id },
          data: { status: "CONFIRMED" },
          include: { lines: true },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return { data: order };
  }

  async createShipment(
    companyId: string,
    actorId: string,
    orderId: string,
    dto: CreateShipmentDto,
  ) {
    if (
      new Set(dto.lines.map((line) => line.salesOrderLineId)).size !==
      dto.lines.length
    ) {
      throw new BadRequestException(
        "A sales-order line may appear only once per shipment",
      );
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.salesOrder.findFirst({
            where: { id: orderId, companyId },
            include: {
              lines: { include: { product: { select: { trackStock: true } } } },
            },
          });
          if (!order) throw new NotFoundException("Sales order not found");
          if (!["CONFIRMED", "PARTIALLY_SHIPPED"].includes(order.status)) {
            throw new ConflictException("Sales order is not open for shipping");
          }
          const lineById = new Map(order.lines.map((line) => [line.id, line]));
          const prepared = dto.lines.map((input) => {
            const line = lineById.get(input.salesOrderLineId);
            if (!line)
              throw new BadRequestException(
                "Shipment line does not belong to this order",
              );
            const quantity = new Decimal(input.quantity);
            const unshipped = new Decimal(line.quantity.toString()).minus(
              line.shippedQuantity.toString(),
            );
            if (!quantity.greaterThan(0) || !quantity.greaterThan(unshipped)) {
              throw new ConflictException(
                "Shipment quantity exceeds the unshipped order quantity",
              );
            }
            if (
              line.product.trackStock &&
              quantity.greaterThan(line.reservedQuantity.toString())
            ) {
              throw new ConflictException(
                "Shipment quantity exceeds the active reservation",
              );
            }
            return { line, quantity };
          });

          const shipment = await tx.salesShipment.create({
            data: {
              companyId,
              salesOrderId: order.id,
              warehouseId: order.warehouseId,
              createdById: actorId,
              number: dto.number,
              ...(dto.shippedAt ? { shippedAt: new Date(dto.shippedAt) } : {}),
              lines: {
                create: prepared.map(({ line, quantity }) => ({
                  salesOrderLineId: line.id,
                  productId: line.productId,
                  quantity: quantity.toFixed(3),
                })),
              },
            },
            include: { lines: true },
          });
          const inputByLineId = new Map(
            prepared.map((entry) => [entry.line.id, entry]),
          );
          for (const shipmentLine of shipment.lines) {
            const source = inputByLineId.get(shipmentLine.salesOrderLineId)!;
            const { line, quantity } = source;
            if (line.product.trackStock) {
              const reservation = await tx.stockReservation.findFirst({
                where: { salesOrderLineId: line.id, status: "ACTIVE" },
                orderBy: { createdAt: "asc" },
              });
              if (!reservation)
                throw new ConflictException(
                  "Active stock reservation was not found",
                );
              const remainingReservation = new Decimal(
                reservation.quantity.toString(),
              ).minus(quantity);
              if (remainingReservation.isNegative()) {
                throw new ConflictException(
                  "Shipment exceeds the reservation record",
                );
              }
              await tx.stockReservation.update({
                where: { id: reservation.id },
                data: {
                  quantity: remainingReservation.toFixed(3),
                  status: remainingReservation.isZero() ? "CONSUMED" : "ACTIVE",
                  ...(remainingReservation.isZero()
                    ? { relaaseedAt: new Date() }
                    : {}),
                },
              });
              await this.inventory.recordMovement(tx, {
                companyId,
                warehouseId: order.warehouseId,
                productId: line.productId,
                createdById: actorId,
                type: "SALES_SHIPMENT",
                quantityDelta: quantity.negated().toFixed(3),
                reservedDelta: quantity.negated().toFixed(3),
                sourceType: "SALES_SHIPMENT",
                sourceId: shipment.id,
                idempotencyKey: `shipment:${shipment.id}:${shipmentLine.id}`,
                note: `Shipment ${shipment.number}`,
              });
            }

            await tx.salesOrderLine.update({
              where: { id: line.id },
              data: {
                shippedQuantity: { increment: quantity.toFixed(3) },
                ...(line.product.trackStock
                  ? { reservedQuantity: { decrement: quantity.toFixed(3) } }
                  : {}),
              },
            });
          }

          const allShipped = order.lines.every((line) => {
            const justShipped =
              inputByLineId.get(line.id)?.quantity ?? new Decimal(0);
            return new Decimal(line.shippedQuantity.toString())
              .plus(justShipped)
              .greaterThanOrEqualTo(line.quantity.toString());
          });
          const updatedOrder = await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: allShipped ? "SHIPPED" : "PARTIALLY_SHIPPED" },
            include: { lines: true },
          });
          return { shipment, order: updatedOrder };
        },
        { isolationLevel: "Serializable" },
      );

      await this.audit.write({
        companyId,
        actorId,
        action: "sales.shipment.created",
        entityType: "SalesShipment",
        entityId: result.shipment.id,
      });
      return { data: result };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Shipment number already exists");
      throw error;
    }
  }
}
