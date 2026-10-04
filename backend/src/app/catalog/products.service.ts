import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@erp/backend-database";
import { AuditService } from "../audit/audit.service";
import { getPagination } from "../common/pagination";
import {
  CreatePartyDto,
  CreateProductDto,
  UpdateProductDto,
} from "./catalog.dto";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    companyId: string,
    query: { page?: string; pageSize?: string; search?: string },
  ) {
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );
    const search = query.search?.trim();
    const where = {
      companyId,
      isActive: true,
      ...(search
        ? {
            OR: [{ sku: { contains: search } }, { name: { contains: search } }],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          unit: true,
          trackStock: true,
          salePrice: true,
          purchasePrice: true,
          reorderPoint: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
  }

  async create(companyId: string, actorId: string, dto: CreateProductDto) {
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
        select: { id: true },
      });
      if (!category)
        throw new BadRequestException("Category is not in this company");
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          companyId,
          sku: dto.sku,
          name: dto.name,
          description: dto.description ?? null,
          unit: dto.unit,
          trackStock: dto.trackStock ?? true,
          categoryId: dto.categoryId ?? null,
          salePrice: dto.salePrice ?? null,
          purchasePrice: dto.purchasePrice ?? null,
          reorderPoint: dto.reorderPoint ?? "0",
        },
        select: {
          id: true,
          sku: true,
          name: true,
          unit: true,
          trackStock: true,
        },
      });

      await this.audit.write({
        companyId,
        actorId,
        action: "catalog.product.create",
        entityType: "Product",
        entityId: product.id,
      });

      return { data: product };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("SKU already exists");
      throw error;
    }
  }

  async update(
    companyId: string,
    actorId: string,
    id: string,
    dto: UpdateProductDto,
  ) {
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId, isActive: true },
      select: { id: true },
    });

    if (!existing) throw new NotFoundException("Product not found");
    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.categoryId, companyId },
        select: { id: true },
      });
      if (!category)
        throw new BadRequestException("Category is not in this company");
    }

    const data = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.trackStock !== undefined ? { trackStock: dto.trackStock } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.salePrice !== undefined ? { salePrice: dto.salePrice } : {}),
      ...(dto.purchasePrice !== undefined
        ? { purchasePrice: dto.purchasePrice }
        : {}),
      ...(dto.reorderPoint !== undefined
        ? { reorderPoint: dto.reorderPoint }
        : {}),
    };

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data,
        select: {
          id: true,
          sku: true,
          name: true,
          unit: true,
          trackStock: true,
        },
      });
      await this.audit.write({
        companyId,
        actorId,
        action: "catalog.product.updated",
        entityType: "Product",
        entityId: id,
      });
      return { data: product };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException(
          "Product confilcts with an existing record",
        );
      throw error;
    }
  }
}
