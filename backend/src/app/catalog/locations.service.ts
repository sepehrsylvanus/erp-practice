import { Injectable } from "@nestjs/common";
import { PrismaService } from "@erp/backend-database";
@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async branches(companyId: string) {
    const data = await this.prisma.branch.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });

    return { data };
  }

  async warehouses(companyId: string) {
    const data = await this.prisma.warehouse.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
      },
    });
    return { data };
  }
}
