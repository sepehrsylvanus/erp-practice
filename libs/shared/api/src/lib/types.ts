export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  companyName: string;
  roles: string[];
  permissions: string[];
}
export interface LoginResult {
  accessToken: string;
  user: SessionUser;
  companies: Array<{ id: string; name: string }>;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  trackStock: boolean;
  salePrice: string | null;
  purchasePrice: string | null;
  reorderPoint: string | null;
}
export interface Party {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
}
export interface Ref {
  id: string;
  code: string;
  name: string;
}
export interface Warehouse extends Ref {
  branchId: string;
  branch: Ref;
}
export interface StockBalance {
  id: string;
  onHand: string;
  reserved: string;
  updatedAt: string;
  product: Ref & { sku: string; unit: string };
  warehouse: Ref;
}
export interface Movement {
  id: string;
  type: string;
  quantityDelta: string;
  unitCost: string | null;
  sourceType: string;
  sourceId: string;
  note: string | null;
  createdAt: string;
  product: Ref & { sku: string; unit: string };
  warehouse: Ref;
}
export interface SalesOrderLine {
  id: string;
  description: string;
  quantity: string;
  reservedQuantity: string;
  shippedQuantity: string;
  unitPrice: string;
  taxRate: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  product: Ref & { sku: string };
}
export interface SalesOrder {
  id: string;
  number: string;
  status: string;
  currency: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  orderDate: string;
  createdAt: string;
  customer: Ref;
  lines: SalesOrderLine[];
}
export interface PurchaseOrderLine {
  id: string;
  description: string;
  quantity: string;
  receivedQuantity: string;
  unitCost: string;
  taxRate: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  product: Ref & { sku: string };
}
export interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  currency: string;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  orderDate: string;
  createdAt: string;
  supplier: Ref;
  lines: PurchaseOrderLine[];
}
export interface Invoice {
  id: string;
  number: string;
  type: "SALES" | "PURCHASE";
  status: string;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
  netAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  customer: Ref | null;
  supplier: Ref | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    totalAmount: string;
  }>;
}
export interface Payment {
  id: string;
  direction: "INCOMING" | "OUTGOING";
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  paidAt: string;
  customer: Ref | null;
  supplier: Ref | null;
  allocations: Array<{
    id: string;
    amount: string;
    invoice: { id: string; number: string; type: string };
  }>;
}
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { id: string; email: string; displayName: string } | null;
}
export interface Overview {
  salesOrderCount: number;
  salesOrderTotal: string;
  purchaseOrderCount: number;
  invoiceCount: number;
  invoiceTotal: string;
  paymentCount: number;
  paymentTotal: string;
  from: string;
  to: string;
}
export interface SalesPoint {
  period: string;
  orderCount: number;
  total: string;
  currency: string;
}
export interface StockValuationRow {
  warehouse: Ref;
  onHand: string;
  unitCost: string;
  estimatedValue: string;
  product: Ref & { sku: string; unit: string };
}
export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  type: string;
  debit: string;
  credit: string;
  netDebit: string;
}
export interface ARRow {
  invoiceId: string;
  number: string;
  bucket: string;
  daysPastDue: number;
  dueDate: string;
  outstanding: string;
  currency: string;
  customer: { code: string; name: string } | null;
}
