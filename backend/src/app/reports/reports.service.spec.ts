import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "@erp/backend-database";
import { ReportsService } from "./reports.service";

describe("ReportingService", () => {
  const findMany = vi.fn();
  const prisma = {
    salesOrder: { findMany },
  } as unknown as PrismaService;
  let service: ReportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportsService(prisma);
  });
  it("groups daily sales without mixing currencies", async () => {
    findMany.mockResolvedValue([
      {
        id: "so-1",
        number: "SO-1",
        orderDate: new Date("2026-06-01T09:00:00.000Z"),
        currency: "EUR",
        totalAmount: new Decimal("10.25"),
      },
      {
        id: "so-2",
        number: "SO-2",
        orderDate: new Date("2026-06-01T12:00:00.000Z"),
        currency: "EUR",
        totalAmount: new Decimal("5.25"),
      },
      {
        id: "so-3",
        number: "SO-3",
        orderDate: new Date("2026-06-01T15:00:00.000Z"),
        currency: "USD",
        totalAmount: new Decimal("7.00"),
      },
    ]);

    const result = await service.sales("company-1", "2026-06-01", "2026-06-30");

    expect(result.data).toEqual([
      { period: "2026-06-01", orderCount: 2, total: "15.50", currency: "EUR" },
      { period: "2026-06-01", orderCount: 1, total: "7.00", currency: "USD" },
    ]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "company-1" }),
        take: 10000,
      }),
    );
  });

  it("rejects an unsupported groupBy before querying the database", async () => {
    await expect(
      service.sales("company-1", "2026-06-01", "2026-06-30", "year"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findMany).not.toHaveBeenCalled();
  });
});
