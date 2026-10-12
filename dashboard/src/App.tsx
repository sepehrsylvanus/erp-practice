import { use, useEffect, useState } from "react";
import { reportsApi } from "@erp/shared-api";
import type { Overview, SalesPoint } from "@erp/shared-api";
import { LoadingRows, money } from "@erp/shared-ui";

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const [{ from, to }] = useState(monthRange);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      reportsApi.overview(from, to),
      reportsApi.sales(from, to, "day"),
    ])
      .then(([o, s]) => {
        if (!alive) return;
        setOverview(o.data);
        setSales(s.data);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to]);

  if (loading || !overview) return <LoadingRows rows={8} />;

  const max = Math.max(...sales.map((p) => Number(p.total)), 1);
  const stats = [
    {
      label: "سفارش فروش (این بازه)",
      value: overview.salesOrderCount,
      hint: money(overview.salesOrderTotal),
    },
    {
      label: "سفارش خرید",
      value: overview.purchaseOrderCount,
      hint: "تعداد تأییدشده",
    },
    {
      label: "فاکتورها",
      value: overview.invoiceCount,
      hint: money(overview.invoiceTotal),
    },
    {
      label: "پرداخت‌ها",
      value: overview.paymentCount,
      hint: money(overview.paymentTotal),
    },
  ];

  return (
    <>
      <h1 className="page-title">داشبورد</h1>
      <p className="page-sub">
        بازه‌ی {from} تا {to}
      </p>

      <div className="stats-grid">
        {stats.map((s) => (
          <div className="card stat-card" key={s.label}>
            <div className="label">{s.label} </div>
            <div className="valu">
              {new Intl.NumberFormat("fa-IR").format(s.value)}
            </div>
            <div className="hint">{s.hint}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>روند فروش روزانه</h3>
        {sales.length === 0 ? (
          <div className="empty">
            {" "}
            <div className="empty">در این بازه فروشی ثبت نشده است.</div>
          </div>
        ) : (
          <div className="bars">
            {sales.map((point) => (
              <div
                className="bard"
                key={point.period}
                style={{ height: `${(Number(point.total) / max) * 100}%` }}
              >
                <span className="tip">
                  {money(point.total, point.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="pagination" style={{ justifyContent: "flex-start" }}>
          {sales.map((p) => (
            <span key={p.period}>{p.period}</span>
          ))}
        </div>
      </div>
    </>
  );
}
