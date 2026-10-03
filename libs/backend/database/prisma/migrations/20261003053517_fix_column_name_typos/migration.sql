/*
  Fix column-name typos introduced in the original `erp_core` migration so they
  match the final schema (e.g. `unitConst` -> `unitCost`, `wuantity` -> `quantity`).
  Columns are renamed (not dropped/re-added) so existing data is preserved.
*/

-- Account: add missing isActive flag
ALTER TABLE "Account" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- GoodsReceipt
ALTER TABLE "GoodsReceipt" RENAME COLUMN "createdbyId" TO "createdById";
ALTER TABLE "GoodsReceipt" RENAME CONSTRAINT "GoodsReceipt_createdbyId_fkey" TO "GoodsReceipt_createdById_fkey";

-- InventoryMovement
ALTER TABLE "InventoryMovement" RENAME COLUMN "unitConst" TO "unitCost";

-- Payment
ALTER TABLE "Payment" RENAME COLUMN "createdbyId" TO "createdById";
ALTER TABLE "Payment" RENAME CONSTRAINT "Payment_createdbyId_fkey" TO "Payment_createdById_fkey";

-- Product
ALTER TABLE "Product" RENAME COLUMN "salesPrice" TO "salePrice";

-- PurchaseOrder
ALTER TABLE "PurchaseOrder" RENAME COLUMN "createById" TO "createdById";
ALTER TABLE "PurchaseOrder" RENAME COLUMN "supplierid" TO "supplierId";
ALTER TABLE "PurchaseOrder" RENAME CONSTRAINT "PurchaseOrder_createById_fkey" TO "PurchaseOrder_createdById_fkey";
ALTER TABLE "PurchaseOrder" RENAME CONSTRAINT "PurchaseOrder_supplierid_fkey" TO "PurchaseOrder_supplierId_fkey";

-- PurchaseOrderLine
ALTER TABLE "PurchaseOrderLine" RENAME COLUMN "wuantity" TO "quantity";

-- RefreshSession
ALTER TABLE "RefreshSession" RENAME COLUMN "created" TO "createdAt";

-- SalesOrder
ALTER TABLE "SalesOrder" RENAME COLUMN "netAmoint" TO "netAmount";
