import { api } from "./client";
import type {
  ARRow,
  AuditLog,
  Invoice,
  LoginResult,
  Movement,
  Overview,
  Party,
  Payment,
  Product,
  PurchaseOrder,
  SalesOrder,
  SalesPoint,
  SessionUser,
  StockBalance,
  StockValuationRow,
  TrialBalanceRow,
  Warehouse,
} from "./types";
import type { PagedResponse } from "@erp/shared-ui";

type Paged = { page?: number; pageSize?: number; search?: string };
const qs = (params: Record<string, unknown>) => {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const authApi = {
  login: (body: { email: string; password: string; companyId?: string }) =>
    api.post<LoginResult>("/auth/login", body),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<{ data: SessionUser }>("/auth/me"),
};

export const catalogApi = {
  products: {
    list: (p: Paged = {}) =>
      api.get<PagedResponse<Product>>(
        `/products${qs({ page: p.page, pageSize: p.pageSize, search: p.search })}`,
      ),
    create: (body: Partial<Product>) =>
      api.post<{ data: Product }>("/products", body),
    update: (id: string, body: Partial<Product>) =>
      api.patch<{ data: Product }>(`/products/${id}`, body),
  },
  customers: {
    list: (p: Paged = {}) =>
      api.get<PagedResponse<Party>>(`/customers${qs(p)}`),
    create: (body: Partial<Party>) =>
      api.post<{ data: Party }>("/customers", body),
  },
  suppliers: {
    list: (p: Paged = {}) =>
      api.get<PagedResponse<Party>>(`/suppliers${qs(p)}`),
    create: (body: Partial<Party>) =>
      api.post<{ data: Party }>("/suppliers", body),
  },
  warehouses: () => api.get<{ data: Warehouse[] }>("/warehouses"),
  branches: () =>
    api.get<{ data: Array<{ id: string; code: string; name: string }> }>(
      "/branches",
    ),
};

export const inventoryApi = {
  balances: (
    p: { warehouseId?: string; productId?: string; page?: number } = {},
  ) =>
    api.get<PagedResponse<StockBalance>>(
      `/inventory/balances${qs({ ...p, pageSize: 25 })}`,
    ),
  movements: (
    p: { warehouseId?: string; productId?: string; page?: number } = {},
  ) =>
    api.get<PagedResponse<Movement>>(
      `/inventory/movements${qs({ ...p, pageSize: 25 })}`,
    ),
  adjust: (
    body: {
      warehouseId: string;
      productId: string;
      quantityDelta: string;
      note: string;
      unitCost?: string;
    },
    idempotencyKey: string,
  ) =>
    api.post("/inventory/adjustments", body, {
      "Idempotency-Key": idempotencyKey,
    }),
};

export const salesApi = {
  orders: (p: Paged = {}) =>
    api.get<PagedResponse<SalesOrder>>(`/sales/orders${qs(p)}`),
  create: (body: unknown) =>
    api.post<{ data: SalesOrder }>("/sales/orders", body),
  confirm: (id: string) =>
    api.post<{ data: SalesOrder }>(`/sales/orders/${id}/confirm`),
  ship: (id: string, body: unknown) =>
    api.post<{ data: unknown }>(`/sales/orders/${id}/shipments`, body),
};

export const purchasingApi = {
  orders: (p: Paged = {}) =>
    api.get<PagedResponse<PurchaseOrder>>(`/purchasing/orders${qs(p)}`),
  create: (body: unknown) =>
    api.post<{ data: PurchaseOrder }>("/purchasing/orders", body),
  approve: (id: string) => api.post(`/purchasing/orders/${id}/approve`),
  receive: (id: string, body: unknown) =>
    api.post(`/purchasing/orders/${id}/receipts`, body),
};

export const financeApi = {
  invoices: (p: { type?: string; page?: number } = {}) =>
    api.get<PagedResponse<Invoice>>(
      `/finance/invoices${qs({ ...p, pageSize: 25 })}`,
    ),
  createInvoice: (body: unknown) => api.post(`/finance/invoices`, body),
  issueInvoice: (id: string) => api.post(`/finance/invoices/${id}/issue`),
  payments: (p: { direction?: string; page?: number } = {}) =>
    api.get<PagedResponse<Payment>>(
      `/finance/payments${qs({ ...p, pageSize: 25 })}`,
    ),
  createPayment: (body: unknown) => api.post(`/finance/payments`, body),
  trialBalance: (from: string, to: string) =>
    api.get<{
      data: TrialBalanceRow[];
      meta: { debitTotal: string; creditTotal: string };
    }>(`/finance/reports/trial-balance${qs({ from, to })}`),
};

export const reportsApi = {
  overview: (from: string, to: string) =>
    api.get<{ data: Overview }>(`/reports/overview${qs({ from, to })}`),
  sales: (from: string, to: string, groupBy = "day") =>
    api.get<{ data: SalesPoint[] }>(
      `/reports/sales${qs({ from, to, groupBy })}`,
    ),
  stockValuation: (warehouseId?: string) =>
    api.get<{
      data: StockValuationRow[];
      meta: { totalEstimatedValue: string; method: string };
    }>(`/reports/stock-valuation${qs({ warehouseId })}`),
  arAging: (asOf: string) =>
    api.get<{
      data: ARRow[];
      meta: {
        asOf: string;
        totals: Record<string, string>;
        totalOutstanding: string;
      };
    }>(`/reports/ar-aging${qs({ asOf })}`),
};

export const adminApi = {
  auditLogs: (
    p: { entityType?: string; entityId?: string; page?: number } = {},
  ) =>
    api.get<PagedResponse<AuditLog>>(
      `/audit-logs${qs({ ...p, pageSize: 25 })}`,
    ),
};
