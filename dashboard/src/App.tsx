import { useEffect, useState } from "react";
import { ApiError } from "@erp/shared-api";
import { reportsApi } from "@erp/shared-api";
import type { Overview, SalesPoint } from "@erp/shared-api";
import {
  ErrorState,
  LoadingRows,
  PageHeader,
  money,
} from "@erp/shared-ui";

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
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    setLoading(true);
    Promise.all([
      reportsApi.overview(from, to),
      reportsApi.sales(from, to, "day"),
    ])
      .then(([o, s]) => {
        if (!alive) return;
        setOverview(o.data);
        setSales(s.data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const status = e instanceof ApiError ? e.status : 0;
        setError(
          status === 401
            ? "نشست شما منقضی شده است. لطفاً دوباره وارد شوید."
            : e instanceof Error
              ? e.message
              : "خطا در دریافت اطلاعات داشبورد.",
        );
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [from, to, reloadKey]);

  if (loading) return <LoadingRows rows={8} />;

  if (error || !overview) {
    return (
      <>
        <PageHeader title="داشبورد" sub={`بازه‌ی ${from} تا ${to}`} />
        <ErrorState
          title="داشبورد بارگذاری نشد"
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
          loginHref="/login"
        />
      </>
    );
  }

  const max = Math.max(...sales.map((p) => Number(p.total)), 1);
  const stats = [
    {
      label: "سفارش فروش (این بازه)",
      value: new Intl.NumberFormat("fa-IR").format(overview.salesOrderCount),
      hint: money(overview.salesOrderTotal),
      icon: "🧾",
      tint: "",
    },
    {
      label: "سفارش خرید",
      value: new Intl.NumberFormat("fa-IR").format(overview.purchaseOrderCount),
      hint: "تعداد تأییدشده",
      icon: "🛒",
      tint: "tint-orange",
    },
    {
      label: "فاکتورها",
      value: new Intl.NumberFormat("fa-IR").format(overview.invoiceCount),
      hint: money(overview.invoiceTotal),
      icon: "📄",
      tint: "tint-blue",
    },
    {
      label: "پرداخت‌ها",
      value: new Intl.NumberFormat("fa-IR").format(overview.paymentCount),
      hint: money(overview.paymentTotal),
      icon: "💰",
      tint: "tint-green",
    },
  ];

  return (
    <>
      <PageHeader
        title="داشبورد"
        sub={`بازه‌ی ${from} تا ${to}`}
        actions={<span className="badge green">● به‌روز</span>}
      />

      <div className="stats-grid">
        {stats.map((s) => (
          <div className={`card stat-card ${s.tint}`} key={s.label}>
            <div className="top">
              <div className="label">{s.label}</div>
              <span className="ic">{s.icon}</span>
            </div>
            <div className="value-big num">{s.value}</div>
            <div className="hint">{s.hint}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>روند فروش روزانه</h3>
        {sales.length === 0 ? (
          <div className="empty">
            <div className="icon">📭</div>
            <div>در این بازه فروشی ثبت نشده است.</div>
          </div>
        ) : (
          <div className="bars">
            {sales.map((point) => (
              <div
                className="bar"
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
