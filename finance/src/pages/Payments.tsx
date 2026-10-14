import { useCallback, useEffect, useState, type FormEvent } from "react";
import { financeApi } from "@erp/shared-api";
import type { Invoice, Payment } from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  Field,
  Modal,
  Pagination,
  dateTime,
  money,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";
import { useSession } from "@erp/shared-auth";
import { toast } from "react-toastify";

export default function PaymentsPage() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState({
    direction: "INCOMING",
    amount: "",
    currency: "IRR",
    method: "BANK_TRANSFER",
    reference: "",
  });
  const [allocation, setAllocation] = useState({ invoiceId: "", amount: "" });
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (creating) {
      financeApi
        .invoices({ page: 1 })
        .then((r) =>
          setOpenInvoices(
            r.data.filter(
              (i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID",
            ),
          ),
        );
    }
  }, [creating]);

  const fetcher = useCallback(
    (p: number) => {
      return financeApi.payments({ page: p });
    },
    [version],
  );

  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery<Payment>(fetcher, page);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await financeApi.createPayment({
        ...form,
        allocations: [
          { invoiceId: allocation.invoiceId, amount: allocation.amount },
        ],
      });
      toast.success("پرداخت ثبت شد ✅");
      setCreating(false);
      setVersion((v) => v + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  }

  const columns: Column<Payment>[] = [
    { key: "paidAt", title: "زمان", render: (r) => dateTime(r.paidAt) },
    {
      key: "direction",
      title: "جهت",
      render: (r) =>
        r.direction === "INCOMING" ? (
          <span className="badge green">دریافتی</span>
        ) : (
          <span className="badge red">پرداختی</span>
        ),
    },
    {
      key: "party",
      title: "طرف حساب",
      render: (r) => r.customer?.name ?? r.supplier?.name ?? "—",
    },
    {
      key: "method",
      title: "روش",
      render: (r) =>
        ({
          BANK_TRANSFER: "انتقال بانکی",
          CASH: "نقد",
          CARD: "کارت",
          OTHER: "سایر",
        })[r.method] ?? r.method,
    },
    { key: "reference", title: "مرجع", render: (r) => r.reference ?? "—" },
    {
      key: "amount",
      title: "مبلغ",
      numeric: true,
      render: (r) => <b>{money(r.amount, r.currency)}</b>,
    },
    {
      key: "allocations",
      title: "تخصیص‌ها",
      numeric: true,
      render: (r) =>
        r.allocations.map((a) => a.invoice.number).join("، ") || "—",
    },
  ];

  return (
    <>
      <h1 className="page-title">پرداخت‌ها</h1>
      <p className="page-sub">دریافت‌ها و پرداخت‌های وجه، متصل به فاکتورها</p>
      <div className="toolbar">
        <div className="spacer" />
        {can("finance.payments.create") && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + ثبت پرداخت
          </button>
        )}
      </div>

      {listError ? (
        <ErrorState
          title="پرداخت‌ها بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="پرداختی ثبت نشده"
          />
          <Pagination
            page={page}
            pageSize={25}
            total={total}
            onPage={setPage}
          />
        </>
      )}

      {creating && (
        <Modal title="ثبت پرداخت جدید" onClose={() => setCreating(false)}>
          <form onSubmit={submit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="جهت">
                <select
                  className="select"
                  value={form.direction}
                  onChange={(e) =>
                    setForm({ ...form, direction: e.target.value })
                  }
                >
                  <option value="INCOMING">دریافتی (از مشتری)</option>
                  <option value="OUTGOING">پرداختی (به تأمین‌کننده)</option>
                </select>
              </Field>{" "}
              <Field label="مبلغ">
                <input
                  className="input"
                  dir="ltr"
                  inputMode="decimal"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </Field>{" "}
              <Field label="ارز">
                <input
                  className="input"
                  dir="ltr"
                  maxLength={3}
                  required
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>{" "}
              <Field label="روش پرداخت">
                <select
                  className="select"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="BANK_TRANSFER">انتقال بانکی</option>
                  <option value="CASH">نقد</option>
                  <option value="CARD">کارت</option>
                  <option value="OTHER">سایر</option>
                </select>
              </Field>
            </div>
            <Field label="شماره‌ی مرجع (شماره‌ی پیگیری، اختیاری)">
              <input
                className="input"
                dir="ltr"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
              />
            </Field>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="تخصیص به فاکتور (الزامی)">
                <select
                  className="select"
                  required
                  value={allocation.invoiceId}
                  onChange={(e) =>
                    setAllocation({ ...allocation, invoiceId: e.target.value })
                  }
                >
                  <option value="">انتخاب فاکتور…</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {money(inv.totalAmount, inv.currency)}
                    </option>
                  ))}
                </select>
              </Field>{" "}
              <Field label="مبلغ تخصیص">
                <input
                  className="input"
                  dir="ltr"
                  inputMode="decimal"
                  required
                  value={allocation.amount}
                  onChange={(e) =>
                    setAllocation({ ...allocation, amount: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCreating(false)}
              >
                انصراف
              </button>
              <button className="btn btn-primary">ثبت</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
