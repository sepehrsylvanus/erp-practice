import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ---------- formatting (یکبار در همه‌ی ماژول‌ها) ---------- */
export const money = (value: string | number, currency = "IRR") =>
  new Intl.NumberFormat("fa-IR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));

export const qty = (value: string | number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 3 }).format(
    Number(value),
  );

export const dateOnly = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(
    new Date(value),
  );

export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

/* ---------- Status badge maps ---------- */
export const SALES_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "پیش‌نویس", tone: "gray" },
  CONFIRMED: { label: "تأییدشده", tone: "blue" },
  PARTIALLY_SHIPPED: { label: "ارسال جزئی", tone: "orange" },
  SHIPPED: { label: "ارسال‌شده", tone: "green" },
  CANCELLED: { label: "لغوشده", tone: "red" },
};
export const PURCHASE_STATUS: Record<string, { label: string; tone: string }> =
  {
    DRAFT: { label: "پیش‌نویس", tone: "gray" },
    APPROVED: { label: "تأییدشده", tone: "blue" },
    PARTIALLY_RECEIVED: { label: "دریافت جزئی", tone: "orange" },
    RECEIVED: { label: "دریافت‌شده", tone: "green" },
    CANCELLED: { label: "لغوشده", tone: "red" },
  };
export const INVOICE_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "پیش‌نویس", tone: "gray" },
  ISSUED: { label: "صادرشده", tone: "blue" },
  PARTIALLY_PAID: { label: "پرداخت جزئی", tone: "orange" },
  PAID: { label: "پرداخت‌شده", tone: "green" },
  VOID: { label: "باطل", tone: "red" },
};
export const MOVEMENT_TYPE: Record<string, string> = {
  OPENING_BALANCE: "موجودی اولیه",
  PURCHASE_RECEIPT: "رسید خرید",
  SALES_SHIPMENT: "حواله فروش",
  ADJUSTMENT: "اصلاح موجودی",
  TRANSFER_IN: "انتقال ورودی",
  TRANSFER_OUT: "انتقال خروجی",
  RETURN_IN: "برگشتی ورودی",
  RETURN_OUT: "برگشتی خروجی",
};

/* ---------- primitives ---------- */
export function Badge({
  tone = "gray",
  children,
}: {
  tone?: string;
  children: ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function StatusBadge({
  map,
  value,
}: {
  map: Record<string, { label: string; tone: string }>;
  value: string;
}) {
  const item = map[value] ?? { label: value, tone: "gray" };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="field" style={style}>
      <label>{label}</label>
      {children}
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon = "📭", text }: { icon?: string; text: string }) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <div>{text}</div>
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="loading-block">
      <div className="loading-head">
        <div className="skeleton" style={{ width: 180, height: 22 }} />
        <div className="skeleton" style={{ width: 260, height: 14 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton" key={i} style={{ margin: "10px 14px" }} />
      ))}
    </div>
  );
}

/* ---------- Page header (تیتر + زیرتیتر + اکشن) — فاز دوم ریدیزاین ---------- */
export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub ? <p className="page-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

/* ---------- Error state (کارت خطای استاندارد + تلاش مجدد) ---------- */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "تلاش مجدد ↻",
  loginHref,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  loginHref?: string;
}) {
  return (
    <div className="card state-card" role="alert">
      <div className="state-icon">⚠️</div>
      <b>{title}</b>
      {message ? <p style={{ color: "var(--muted)" }}>{message}</p> : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {onRetry ? (
          <button className="btn btn-primary btn-sm" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        {loginHref ? (
          <a className="btn btn-ghost btn-sm" href={loginHref}>
            رفتن به ورود ←
          </a>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Search input (جستجو با آیکون + پاک‌کن) ---------- */
export function SearchInput({
  value,
  onChange,
  placeholder = "جستجو…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="input-wrap search-wrap">
      <span className="input-icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="input has-icon"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="eye-btn"
          aria-label="پاک‌کردن جستجو"
          onClick={() => onChange("")}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
/* ---------- Table + Pagination ---------- */
export interface Column<T> {
  key: string;
  title: string;
  render?: (row: T) => ReactNode;
  numeric?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyText = "موردی یافت ند",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading) return <LoadingRows />;
  if (rows.length === 0) return <Empty text={emptyText} />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String((row as Record<string, unknown>).id ?? i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.numeric ? "num" : undefined}>
                  {c.render
                    ? c.render(row)
                    : String((row as Record<string, unknown>)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        صفحه‌ی {new Intl.NumberFormat("fa-IR").format(page)} از{" "}
        {new Intl.NumberFormat("fa-IR").format(pages)} — مجموع{" "}
        {new Intl.NumberFormat("fa-IR").format(total)} ردیف
      </span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        قبلی
      </button>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        بعدی
      </button>
    </div>
  );
}

/* ---------- Toast ---------- */
interface ToastItem {
  id: number;
  text: string;
  tone: string;
}
const ToastCtx = createContext<(text: string, tone?: string) => void>(
  () => undefined,
);

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- usePagedQuery: اتصال به envelope استاندارد بک‌اند ---------- */
export interface PagedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}
export function usePagedQuery<T>(
  fetcher: (page: number) => Promise<PagedResponse<T>>,
  page: number,
) {
  const [state, setState] = useState<{
    rows: T[];
    total: number;
    loading: boolean;
    error: string;
  }>({
    rows: [],
    total: 0,
    loading: true,
    error: "",
  });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fetcher(page)
      .then((res) => {
        if (alive)
          setState({
            rows: res.data,
            total: res.meta.total,
            loading: false,
            error: "",
          });
      })
      .catch((err: Error) => {
        if (alive)
          setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => {
      alive = false;
    };
  }, [fetcher, page]);
  return state;
}
