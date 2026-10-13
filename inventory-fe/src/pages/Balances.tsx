import { useCallback, useEffect, useState } from "react";
import { catalogApi, inventoryApi } from "@erp/shared-api";
import type { StockBalance, Warehouse } from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  PageHeader,
  Pagination,
  qty,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";

export default function BalancesPages() {
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    catalogApi.warehouses().then((r) => setWarehouses(r.data));
  }, []);

  const fetcher = useCallback(
    (p: number) => inventoryApi.balances({ page: p, warehouseId }),
    [warehouseId, version],
  );

  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery(fetcher, page);

  const columns: Column<StockBalance>[] = [
    {
      key: "warehouse",
      title: "انبار",
      render: (r) => `${r.warehouse.code} — ${r.warehouse.name}`,
    },
    {
      key: "product",
      title: "کالا",
      render: (r) => (
        <>
          <code dir="ltr">{r.product.sku}</code> {r.product.name}
        </>
      ),
    },
    {
      key: "onHand",
      title: "موجودی",
      numeric: true,
      render: (r) => `${qty(r.onHand)} ${r.product.unit}`,
    },
    {
      key: "reserved",
      title: "رزروشده",
      numeric: true,
      render: (r) => qty(r.reserved),
    },
    {
      key: "available",
      title: "قابل فروش",
      numeric: true,
      render: (r) => <b>{qty(Number(r.onHand) - Number(r.reserved))}</b>,
    },
  ];

  return (
    <>
      <PageHeader
        title="موجودی انبار"
        sub="مانده‌ی هر کالا در هر انبار، به‌روز پس از هر تراکنش"
        actions={
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setVersion((v) => v + 1)}
          >
            🔄 بروزرسانی
          </button>
        }
      />
      <div className="toolbar">
        <select
          className="select"
          style={{ maxWidth: 280 }}
          onChange={(e) => {
            setWarehouseId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">همه‌ی انبارها</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} - {w.name}
            </option>
          ))}
        </select>
      </div>
      {listError ? (
        <ErrorState
          title="موجودی بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="موجودی‌ای ثبت نشده"
          />
          <Pagination
            page={page}
            pageSize={25}
            total={total}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
