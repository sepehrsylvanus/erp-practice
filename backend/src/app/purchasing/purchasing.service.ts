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
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseLineDto,
  ReceivePurchaseOrderDto,
} from "./purchasing.dto";
import { prependListener } from "node:process";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class PurchasingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async list(companyId: string, page?: string, pageSize?: string) {
    const pagination = getPagination(page, pageSize);
    const where = { companyId };
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async create(
    companyId: string,
    actorId: string,
    dto: CreatePurchaseOrderDto,
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
    const [supplier, branch, warehouse] = await Promise.all([
      this.prisma.supplier.findUnique({
        where: { id: dto.supplierId, companyId, isActive: true },
      }),
      this.prisma.branch.findFirst({ where: { id: dto.branchId, companyId } }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId, isActive: true },
      }),
    ]);
    if (
      !supplier ||
      !branch ||
      !warehouse ||
      warehouse.branchId !== branch.id
    ) {
      throw new BadRequestException(
        "Supplier, branch and warehouse must belong to this company",
      );
    }

    const productIds = [...new Set(dto.lines.map((line) => line.productId))];
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, id: { in: productIds } },
      select: { id: true, name: true, trackStock: true },
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
      const product = productById.get(line.productId)!;
      const quantity = new Decimal(line.quantity);
      const unitCost = new Decimal(line.unitCost);
      const taxRate = new Decimal(line.taxRate ?? "0");
      if (
        !quantity.greaterThan(0) ||
        !taxRate.isFinite() ||
        taxRate.greaterThan(100)
      ) {
        throw new BadRequestException("Quantity or tax rate is invalid");
      }
      const netAmount = quantity.mul(unitCost).toDecimalPlaces(2);
      const taxAmount = netAmount.mul(taxRate).div(100).toDecimalPlaces(2);
      return {
        productId: line.productId,
        description: line.description ?? product.name,
        quantity: quantity.toFixed(3),
        unitCost: unitCost.toFixed(2),
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
    const number = `PO-${randomUUID().slice(0, 8).toUpperCase()}`;

    try {
      const order = await this.prisma.purchaseOrder.create({
        data: {
          companyId,
          supplierId: supplier.id,
          branchId: branch.id,
          warehouseId: warehouse.id,
          createdById: actorId,
          number,
          currency: dto.currency,
          netAmount: netAmount.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          lines: {
            create: lines.map(({ _net, _tax, ...line }) => line),
          },
        },
        include: { lines: true },
      });
      await this.audit.write({
        companyId,
        actorId,
        action: "purchasing.order.created",
        entityType: "PurchaseOrder",
        entityId: order.id,
      });
      return { data: order };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Purchase order number already exists");
      throw error;
    }
  }

  async approve(companyId: string, actorId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException("Purchase order not found");
    if (order.status !== "DRAFT") {
      throw new ConflictException(
        "Only a draft purchase order can be approved",
      );
    }
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: "APPROVED" },
      include: { lines: true },
    });
    await this.audit.write({
      companyId,
      actorId,
      action: "purchasing.order.approved",
      entityType: "PurchaseOrder",
      entityId: id,
    });
    return { data: updated };
  }

  async receive(
    companyId: string,
    actorId: string,
    orderId: string,
    dto: ReceivePurchaseOrderDto,
  ) {
    if (
      new Set(dto.lines.map((line) => line.purchaseOrderLineId)).size !==
      dto.lines.length
    ) {
      throw new BadRequestException(
        "A purchase-order line may appear only once per receipt",
      );
    }
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.purchaseOrder.findFirst({
            where: { id: orderId, companyId },
            include: { lines: true },
          });
          if (!order) throw new NotFoundException("Purchase order not found");
          if (!["APPROVED", "PATIALLY_RECEIVED"].includes(order.status)) {
            throw new ConflictException(
              "Purchase order is not open for receiving",
            );
          }
          const lineById = new Map(order.lines.map((line) => [line.id, line]));
          const prepared = dto.lines.map((input) => {
            const line = lineById.get(input.purchaseOrderLineId);
            if (!line)
              throw new BadRequestException(
                "Receipt line does not belong to this order",
              );
            const quantity = new Decimal(input.quantity);
            const outstanding = new Decimal(line.quantity.toString()).minus(
              line.receivedQuantity.toString(),
            );
            if (!quantity.greaterThan(0) || quantity.greaterThan(outstanding)) {
              throw new ConflictException(
                "Receipt quantity exceeds the outstanding order quantity",
              );
            }
            return {
              purchaseOrderLineId: line.id,
              productId: line.productId,
              quantity,
              unitCost: input.unitCost ?? line.unitCost.toString(),
              orderLine: line,
            };
          });
          const receipt = await tx.goodsReceipt.create({
            data: {
              companyId,
              purchaseOrderId: orderId,
              warehouseId: order.warehouseId,
              createdById: actorId,
              number: dto.number,
              ...(dto.receivedAt
                ? { receivedAt: new Date(dto.receivedAt) }
                : {}),
              lines: {
                create: prepared.map((line) => ({
                  purchaseOrderLineId: line.purchaseOrderLineId,
                  productId: line.productId,
                  quantity: line.quantity.toFixed(3),
                  unitCost: new Decimal(line.unitCost).toFixed(4),
                })),
              },
            },
            include: { lines: true },
          });

          const preparedByOrderLine = new Map(
            prepared.map((line) => [line.purchaseOrderLineId, line]),
          );
          for (const receiptLine of receipt.lines) {
            const source = preparedByOrderLine.get(
              receiptLine.purchaseOrderLineId,
            );
            await tx.purchaseOrderLine.update({
              where: { id: source.purchaseOrderLineId },
              data: {
                receivedQuantity: { increment: source.quantity.toFixed(3) },
              },
            });
            await this.inventory.recordMovement(tx, {
              companyId,
              warehouseId: order.warehouseId,
              productId: source.productId,
              createdById: actorId,
              type: "PURCHASE_RECEIPT",
              quantityDelta: source.quantity.toFixed(3),
              unitCost: new Decimal(source.unitCost).toFixed(4),
              sourceType: "GOODS_RECEIPT",
              sourceId: receipt.id,
              idempotencyKey: `receipt:${receipt.id}:${receiptLine.id}`,
              note: `Receipt ${receipt.number}`,
            });
          }

          const allReceived = order.lines.every((line) => {
            const justReceived =
              preparedByOrderLine.get(line.id)?.quantity ?? new Decimal(0);
            return new Decimal(line.receivedQuantity.toString())
              .plus(justReceived)
              .greaterThanOrEqualTo(line.quantity.toString());
          });
          const updatedOrder = await tx.purchaseOrder.update({
            where: { id: order.id },
            data: { status: allReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
            include: { lines: true },
          });
          return { receipt, order: updatedOrder };
        },
        { isolationLevel: "Serializable" },
      );

      await this.audit.write({
        companyId,
        actorId,
        action: "purchasing.receipt.created",
        entityType: "GoodsReceipt",
        entityId: result.receipt.id,
      });
      return { data: result };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException(
          "Receipt number already exists; retry with a new number",
        );
      throw error;
    }
  }
}
