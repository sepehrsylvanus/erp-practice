import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../libs/backend/database/src/lib/prisma.service";
import { getPagination } from "../common/pagination";

export interface AuditWriteInput {
  companyId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityid: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditWriteInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        ...(input.actorId ? { actorId: input.actorId } : {}),
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityid,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      },
    });
  }

  async list(
    companyId: string,
    query: {
      entityType?: string;
      entityId?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const { page, pageSize, skip, take } = getPagination(
      query.page,
      query.pageSize,
    );

    const where = {
      companyId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          actorId: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actor: { select: { id: true, email: true, displayName: true } },
        },
      }),

      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { page, pageSize, total } };
  }
}
