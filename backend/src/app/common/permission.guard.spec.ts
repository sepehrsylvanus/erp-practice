import { describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionGuard } from "./permission.guard";

function contextWithPermissions(permissions: string[]): ExecutionContext {
  const request = { user: { permissions } };
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(["inventory.adjust"]),
  } as unknown as Reflector;
  const guard = new PermissionGuard(reflector);

  it("allows access when all required permissions are present", () => {
    expect(
      guard.canActivate(contextWithPermissions(["inventory.adjust"])),
    ).toBe(true);
  });
  it("throws ForbiddenException when a required permission is missing", () => {
    expect(() => guard.canActivate(contextWithPermissions([]))).toThrow(
      ForbiddenException,
    );
  });
});
