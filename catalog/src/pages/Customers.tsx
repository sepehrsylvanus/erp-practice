import { useCallback, useState, type FormEvent } from "react";
import { catalogApi } from "@erp/shared-api";
import type { Party, tryRefresh } from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  usePagedQuery,
  useToast,
  type Column,
} from "@erp/shared-ui";
import { useSession } from "@erp/shared-auth";

export default function CustomerPage() {
  const { can } = useSession();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    taxId: "",
  });

  const fetcher = useCallback(
    (p: number) => catalogApi.customers.list({ page: p, pageSize: 25 }),
    [version],
  );

  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery<Party>(fetcher, page);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await catalogApi.customers.create(form);
      toast("مشتری ساخته شد ✅", "success");
      setCreating(false);
      setForm({ code: "", name: "", email: "", phone: "", taxId: "" });
      setVersion((v) => v + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : "خطا", "error");
    }
  }

  const columns: Column<Party>[] = [
    {
      key: "code",
      title: "کد",
      render: (r) => <code dir="ltr">{r.code}</code>,
    },
    { key: "name", title: "نام" },
    { key: "email", title: "ایمیل", render: (r) => r.email ?? "—" },
    { key: "phone", title: "تلفن", render: (r) => r.phone ?? "—" },
  ];

  return (
    <>
      <PageHeader
        title="مشتریان"
        sub="طرف‌حساب‌های فروش"
        actions={
          can("catalog.parties.write") && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCreating(true)}
            >
              ＋ مشتری جدید
            </button>
          )
        }
      />
      {listError ? (
        <ErrorState
          title="مشتریان بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="مشتری‌ای ثبت نشده"
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
        <Modal title="مشتری جدید" onClose={() => setCreating(false)}>
          <form onSubmit={submit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="کد (مثل C-001)">
                <input
                  className="input"
                  dir="ltr"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  pattern="[A-Z0-9._-]{2,32}"
                  required
                />
              </Field>
              <Field label="نام">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="ایمیل (اختیاری)">
                <input
                  className="input"
                  dir="ltr"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>{" "}
              <Field label="تلفن (اختیاری)">
                <input
                  className="input"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              <button className="btn btn-primary">ذخیره</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
