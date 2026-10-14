import { useEffect, useState } from "react";
import { catalogApi, reportsApi } from "@erp/shared-api";
import type { ARRow, Overview, SalesPoint, Warehouse } from "@erp/shared-api";
import {
  DataTable,
  Field,
  LoadingRows,
  dateOnly,
  money,
  type Column,
} from "@erp/shared-ui";
import { toast } from "react-toastify";

function range30() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const [{ from, to }] = useState(range30);
  const [groupBy, setGroupBy] = useState("day");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [stockTotal, setStockTotal] = useState("0");
  const [ar, setAr] = useState<{ rows: ARRow[]; total: string }>({
    rows: [],
    total: "0",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi.warehouses().then((r) => setWarehouses(r.data));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      reportsApi.overview(from, to),
      reportsApi.sales(from, to, groupBy),
      reportsApi.stockValuation(warehouseId || undefined),
      reportsApi.arAging(asOf),
    ])
      .then(([o, s, v, a]) => {
        if (!alive) return;
        setOverview(o.data);
        setSales(s.data);
        setStockTotal(v.meta.totalEstimatedValue);
        setAr({ rows: a.data, total: a.meta.totalOutstanding });
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "خطا"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to, groupBy, warehouseId, asOf]);

  if (loading || !overview) return <LoadingRows rows={10} />;
  const max = Math.max(...sales.map((p) => Number(p.total)), 1);
  const arCols: Column<ARRow>[] = [
    {
      key: "number",
      title: "فاکتور",
      render: (r) => <code dir="ltr">{r.number}</code>,
    },
    { key: "customer", title: "مشتری", render: (r) => r.customer?.name ?? "—" },
    {
      key: "bucket",
      title: "بازه",
      render: (r) => <code dir="ltr">{r.bucket}</code>,
    },
    {
      key: "outstanding",
      title: "مانده",
      numeric: true,
      render: (r) => money(r.outstanding, r.currency),
    },
  ];

  return (
    <>
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="label">فروش</div>
          <div className="value">{money(overview.salesOrderTotal)}</div>
          <div className="hint">{overview.salesOrderCount} سفارش</div>
        </div>
        <div className="card stat-card">
          <div className="label">فاکتورها</div>
          <div className="value">{money(overview.invoiceTotal)}</div>
          <div className="hint">{overview.invoiceCount} فاکتور</div>
        </div>
        <div className="card stat-card">
          <div className="label">ارزش موجودی</div>
          <div className="value">{money(stockTotal)}</div>
          <div className="hint">تا انبار انتخابی</div>
        </div>
        <div className="card stat-card">
          <div className="label">مطالبات باز</div>
          <div className="value">{money(ar.total)}</div>
          <div className="hint">{ar.rows.length} فاکتور</div>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>روند فروش</h3>
          <div className="spacer" />
          <select
            className="select"
            style={{ maxWidth: 160 }}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="day">روزانه</option>
            <option value="month">ماهانه</option>
          </select>
        </div>
        {sales.length === 0 ? (
          <div className="empty">فروشی در این بازه نیست.</div>
        ) : (
          <div className="bars">
            {sales.map((p) => (
              <div
                className="bar"
                key={p.period}
                style={{ height: `${(Number(p.total) / max) * 100}%` }}
              >
                <span className="tip">{money(p.total, p.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>سنی مطالبات</h3>
          <div className="spacer" />
          <Field label="تا تاریخ" style={{ minWidth: 180 }}>
            <input
              className="input"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </Field>{" "}
          <Field label="انبار" style={{ minWidth: 200 }}>
            <select
              className="select"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">همه‌ی انبارها</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <DataTable
          columns={arCols}
          rows={ar.rows}
          emptyText="مطالبات بازی نیست"
        />
      </div>
    </>
  );
}
