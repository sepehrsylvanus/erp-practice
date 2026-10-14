import { useState } from "react";
import { financeApi } from "@erp/shared-api";
import type { TrialBalanceRow } from "@erp/shared-api";
import { DataTable, Field, money, type Column } from "@erp/shared-ui";
import { toast } from "react-toastify";

export default function TrialBalancePage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [meta, setMeta] = useState({ debitTotal: "0", creditTotal: "0" });
  const [loaded, setLoaded] = useState(false);

  async function load() {
    try {
      const res = await financeApi.trialBalance(from, to);
      setRows(res.data);
      setMeta(res.meta);
      setLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  }

  const columns: Column<TrialBalanceRow>[] = [
    {
      key: "code",
      title: "کد حساب",
      render: (r) => <code dir="ltr">{r.code}</code>,
    },
    { key: "name", title: "نام حساب", render: (r) => r.name },
    {
      key: "debit",
      title: "بدهکار",
      numeric: true,
      render: (r) => money(r.debit, "IRR"),
    },
    {
      key: "credit",
      title: "بستانکار",
      numeric: true,
      render: (r) => money(r.credit, "IRR"),
    },
  ];

  return (
    <>
      <h1 className="page-title">تراز آزمایشی</h1>
      <p className="page-sub">
        مانده‌ی بدهکار / بستانکار حساب‌ها تا تاریخ مشخص
      </p>
      <div className="toolbar">
        <Field label="از تاریخ" style={{ minWidth: 200 }}>
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>{" "}
        <Field label="تا تاریخ" style={{ minWidth: 200 }}>
          <input
            className="input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>{" "}
        <button className="btn btn-primary" onClick={load}>
          محاسبه‌ی تراز
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        emptyText="بازه را انتخاب و دکمه را بزنید"
      />
      {loaded && (
        <p className="muted">
          جمع بدهکار: {money(meta.debitTotal)} — جمع بستانکار:{" "}
          {money(meta.creditTotal)}
        </p>
      )}
    </>
  );
}
