import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "@erp/backend-database";
import { AuditService } from "../audit/audit.service";
import { getPagination } from "../common/pagination";
import { CreatePartyDto } from "./catalog.dto";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCustomers(companyId: string, page?: string, pageSize?: string) {
    const pagination = getPagination(page, pageSize);
    const where = { companyId, isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          taxId: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createCustomer(
    companyId: string,
    actorId: string,
    dto: CreatePartyDto,
  ) {
    try {
      const costumer = await this.prisma.customer.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          taxId: dto.taxId ?? null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          taxId: true,
        },
      });
      await this.audit.write({
        companyId,
        actorId,
        action: "catalog.customer.create",
        entityType: "Costumer",
        entityId: costumer.id,
      });
      return { data: costumer };
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Customer code already exists");
      throw error;
    }
  }

  async listSuppliers(companyId: string, page?: string, pageSize?: string) {
    const pagination = getPagination(page, pageSize);
    const where = { companyId, isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          taxId: true,
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return {
      data,
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createSupplier(
    companyId: string,
    actorId: string,
    dto: CreatePartyDto,
  ) {
    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          taxId: dto.taxId ?? null,
        },

        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          phone: true,
          taxId: true,
        },
      });
      await this.audit.write({
        companyId,
        actorId,
        action: "catalog.supplier.created",
        entityType: "Supplier",
        entityId: supplier.id,
      });
    } catch (error) {
      if (isUniqueError(error))
        throw new ConflictException("Supplier code already exists");
      throw error;
    }
  }
}
