import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import Decimal from "decimal.js";
import { database, PrismaService } from "@erp/backend-database";
import { AuditService } from "../audit/audit.service";
import { getPagination } from "../common/pagination";
import { AdjustStockDto } from "./inventory.dto";

export type InventoryTransaction = Pick<
  PrismaService,
  "stockBalance" | "inventoryMovement" | "stockReservation"
>;

export type MovementKind =
  | "OPENING_BALANCE"
  | "PURCHASE_RECEIPT"
  | "SALES_SHIPMENT"
  | "ADJUSTMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN_IN"
  | "RETURN_OUT";

export interface MovementInput {
  companyId: string;
  warehouseId: string;
  productId: string;
  createdById?: string;
  type: MovementKind;
  quantityDelta: string;
  reservedDelta?: string;
  unitCost?: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey?: string;
  note?: string;
}

export interface ReserveStockInput {
  companyId: string;
  warehouseId: string;
  productId: string;
  salesOrderLineId: string;
  quantity: string;
  idempotencyKey?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async recordMovement(tx: InventoryTransaction, input: MovementInput) {
    if (input.idempotencyKey) {
      const previous = await tx.inventoryMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (previous) {
        const requestedDelta = new Decimal(input.quantityDelta).toFixed(3);
        if (
          previous.companyId !== input.companyId ||
          previous.warehouseId !== input.warehouseId ||
          previous.productId !== input.productId ||
          previous.type !== input.type ||
          previous.sourceType !== input.sourceType ||
          previous.sourceId !== input.sourceId ||
          (previous.note ?? "") !== (input.note ?? "") ||
          !new Decimal(previous.quantityDelta.toString()).equals(requestedDelta)
        ) {
          throw new ConflictException(
            "Idempotency-Key was already used for a different movement",
          );
        }

        return previous;
      }
    }

    const delta = new Decimal(input.quantityDelta);
    const reservedDelta = new Decimal(input.reservedDelta ?? "0");
    if (!delta.isFinite() || delta.isZero()) {
      throw new BadRequestException("quantityDelta must be a non-zero decimal");
    }

    const key = {
      warehouseId_productId: {
        warehouseId: input.warehouseId,
        productId: input.productId,
      },
    };
    const current = await tx.stockBalance.findUnique({ where: key });
    const onHand = new Decimal(current?.onHand.toString() ?? "0").plus(delta);
    const reserved = new Decimal(current?.reserved.toString() ?? "0").plus(
      reservedDelta,
    );
    if (
      onHand.isNegative() ||
      reserved.isNegative() ||
      reserved.greaterThan(onHand)
    ) {
      throw new ConflictException(
        "Movement would make stock or reservation invalid",
      );
    }

    await tx.stockBalance.upsert({
      where: key,
      create: {
        companyId: input.companyId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        onHand: onHand.toFixed(3),
        reserved: reserved.toFixed(3),
      },
      update: {
        onHand: onHand.toFixed(3),
        reserved: reserved.toFixed(3),
      },
    });

    return tx.inventoryMovement.create({
      data: {
        companyId: input.companyId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        ...(input.createdById ? { createdById: input.createdById } : {}),
        type: input.type,
        quantityDelta: delta.toFixed(3),
        ...(input.unitCost ? { unitCost: input.unitCost } : {}),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        ...(input.note ? { note: input.note } : {}),
      },
    });
  }

  async reserveStock(tx: InventoryTransaction, input: ReserveStockInput) {
    if (input.idempotencyKey) {
      const previous = await tx.stockReservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (previous) {
        if (
          previous.companyId !== input.companyId ||
          previous.warehouseId !== input.warehouseId ||
          previous.productId !== input.productId ||
          previous.salesOrderLineId !== input.salesOrderLineId ||
          !new Decimal(previous.quantity.toString()).equals(input.quantity)
        ) {
          throw new ConflictException(
            "Reservation idempotency key was reused with different data",
          );
        }

        return previous;
      }
    }

    const quantity = new Decimal(input.quantity);
    if (!quantity.isFinite() || !quantity.greaterThan(0)) {
      throw new BadRequestException("Reservation quantity must be positive");
    }

    const key = {
      warehouseId_productId: {
        warehouseId: input.warehouseId,
        productId: input.productId,
      },
    };
    const balance = await tx.stockBalance.findUnique({ where: key });
    if (!balance)
      throw new ConflictException('"No stock balance exists for this product"');
    const onHand = new Decimal(balance.onHand.toString());
    const reserved = new Decimal(balance.reserved.toString()).plus(quantity);
    if (reserved.greaterThan(onHand)) {
      throw new ConflictException("Insufficient available stock");
    }
    await tx.stockBalance.update({
      where: key,
      data: {
        reserved: reserved.toFixed(3),
      },
    });
    return tx.stockReservation.create({
      data: {
        companyId: input.companyId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        salesOrderLineId: input.salesOrderLineId,
        quantity: quantity.toFixed(3),
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
      },
    });
  }

  async adjust(
    companyId: string,
    actorId: string,
    dto: AdjustStockDto,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 120) {
      throw new BadRequestException(
        "A valid Idempotency-Key header is required",
      );
    }
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId, isActive: true },
        select: { id: true },
      }),
      this.prisma.product.findFirst({
        where: { id: dto.productId, companyId, isActive: true },
        select: { id: true, trackStock: true },
      }),
    ]);
    if (!warehouse || !product) {
      throw new NotFoundException(
        "Product or warehouse not found in this company",
      );
    }
    if (!dto.note.trim())
      throw new BadRequestException("A non-empty adjustment note is required");

    const movement = await this.prisma.$transaction(
      (tx) =>
        this.recordMovement(tx, {
          companyId,
          warehouseId: warehouse.id,
          productId: product.id,
          createdById: actorId,
          type: "ADJUSTMENT",
          quantityDelta: dto.quantityDelta,
          unitCost: dto.unitCost,
          sourceType: "MANUAL_ADJUSTMENT",
          sourceId: idempotencyKey,
          idempotencyKey,
          note: dto.note,
        }),
      { isolationLevel: "Serializable" },
    );

    await this.audit.write({
      companyId,
      actorId,
      action: "inventory.adjust",
      entityType: "InventoryMovement",
      entityId: movement.id,
    });
    return { data: movement };
  }

  async balances(
    companyId: string,
    query: {
      warehouseId?: string;
      productId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const pagination = getPagination(query.page, query.pageSize);
    const where = {
      companyId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockBalance.findMany({
        where,
        orderBy: [{ warehouseId: "asc" }, { productId: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      }),

      this.prisma.stockBalance.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSie: pagination.pageSize, total },
    };
  }

  async movements(
    companyId: string,
    query: {
      warehouseId?: string;
      productId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const pagination = getPagination(query.page, query.pageSize);
    const where = {
      companyId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }
}
