import { useCallback, useState } from "react";
import { financeApi } from "@erp/shared-api";
import type { Invoice } from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  INVOICE_STATUS,
  Pagination,
  StatusBadge,
  dateOnly,
  money,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";
import { useSession } from "@erp/shared-auth";
import { toast } from "react-toastify";

export default function InvoicesPage() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState("");

  const fetcher = useCallback(
    (p: number) => {
      return financeApi.invoices({ page: p, type });
    },
    [type, version],
  );

  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery<Invoice>(fetcher, page);

  async function issue(id: string) {
    setBusyId(id);
    try {
      await financeApi.issueInvoice(id);
      toast.success("فاکتور صادر شد ✅");
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusyId("");
    }
  }

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      title: "شماره",
      render: (r) => <code dir="ltr">{r.number}</code>,
    },
    {
      key: "type",
      title: "نوع",
      render: (r) => (r.type === "SALES" ? "فروش" : "خرید"),
    },
    {
      key: "party",
      title: "طرف حساب",
      render: (r) => r.customer?.name ?? r.supplier?.name ?? "—",
    },
    {
      key: "status",
      title: "وضعیت",
      render: (r) => <StatusBadge map={INVOICE_STATUS} value={r.status} />,
    },
    {
      key: "issueDate",
      title: "تاریخ صدور",
      render: (r) => (r.issueDate ? dateOnly(r.issueDate) : "—"),
    },
    {
      key: "totalAmount",
      title: "کل",
      numeric: true,
      render: (r) => money(r.totalAmount, r.currency),
    },
    {
      key: "paidAmount",
      title: "پرداخت‌شده",
      numeric: true,
      render: (r) => money(r.paidAmount, r.currency),
    },
    {
      key: "actions",
      title: "",
      render: (r) =>
        r.status === "DRAFT" && can("finance.invoice.post") ? (
          <button
            className="btn btn-primary btn-sm"
            disabled={busyId === r.id}
            onClick={() => issue(r.id)}
          >
            صدور
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <h1 className="page-title">فاکتورها</h1>
      <p className="page-sub">فاکتورهای فروش و خرید، صدور و وضعیت پرداخت</p>
      <div className="toolbar">
        <select
          className="select"
          style={{ maxWidth: 220 }}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">همه</option>
          <option value="SALES">فروش</option>
          <option value="PURCHASE">خرید</option>
        </select>
      </div>

      {listError ? (
        <ErrorState
          title="فاکتورها بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="فاکتوری صادر نشده"
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
