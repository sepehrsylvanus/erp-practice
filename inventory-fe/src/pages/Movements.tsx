import { useCallback, useState } from "react";
import { inventoryApi } from "@erp/shared-api";
import type { Movement } from "@erp/shared-api";
import {
  DataTable,
  MOVEMENT_TYPE,
  Pagination,
  dateTime,
  qty,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";

export default function MovementsPage() {
  const [page, setPage] = useState(1);
  const fetcher = useCallback((p: number) => {
    return inventoryApi.movements({ page: p });
  }, []);

  const { rows, total, loading } = usePagedQuery<Movement>(fetcher, page);

  const columns: Column<Movement>[] = [
    { key: "createdAt", title: "زمان", render: (r) => dateTime(r.createdAt) },
    {
      key: "type",
      title: "نوع",
      render: (r) => MOVEMENT_TYPE[r.type] ?? r.type,
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
    { key: "warehouse", title: "انبار", render: (r) => r.warehouse.name },
    {
      key: "quantityDelta",
      title: "مقدار",
      numeric: true,
      render: (r) => (
        <b
          style={{
            color:
              Number(r.quantityDelta) >= 0 ? "var(--success)" : "var(--danger)",
          }}
        >
          {Number(r.quantityDelta) > 0 ? "+" : ""}
          {qty(r.quantityDelta)}
        </b>
      ),
    },
    {
      key: "sourceType",
      title: "مبدأ",
      render: (r) => <code dir="ltr">{r.sourceType}</code>,
    },
    { key: "note", title: "توضیح", render: (r) => r.note ?? "—" },
  ];

  return (
    <>
      <h1 className="page-title">گردش کالا</h1>
      <p className="page-sub">
        دفتر تغییرناپذیر حرکات انبار — هر ردیف به سند مبدأ متصل است
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="گردشی ثبت نشده"
      />
      <Pagination page={page} pageSize={25} total={total} onPage={setPage} />
    </>
  );
}
