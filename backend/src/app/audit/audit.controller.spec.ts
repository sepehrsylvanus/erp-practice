import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

describe("AuditController", () => {
  it("uses the authenticated user companyId instead of a client-supplied value", () => {
    const list = vi.fn();
    const controller = new AuditController({ list } as unknown as AuditService);
    const request = {
      user: { companyId: "company-1" },
    } as AuthenticatedRequest;

    controller.list(request, "User", undefined, "2", "10");

    expect(list).toHaveBeenCalledWith("company-1", {
      entityType: "User",
      entityId: undefined,
      page: "2",
      pageSize: "10",
    });
  });
});
