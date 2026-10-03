import type { Request } from "express";

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  companyName: string;
  roles: string[];
  permissions: string[];
}

export interface CompanyContext {
  id: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
