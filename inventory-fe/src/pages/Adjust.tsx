import { useEffect, useState, type FormEvent } from "react";
import { catalogApi, inventoryApi } from "@erp/shared-api";
import type { Product, Warehouse } from "@erp/shared-api";
import { Field, PageHeader, useToast } from "@erp/shared-ui";
import { useSession } from "@erp/shared-auth";

export default function AdjustPage() {
  const { can } = useSession();
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    warehouseId: "",
    productId: "",
    quantityDelta: "",
    note: "",
    unitCost: "",
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    catalogApi.warehouses().then((r) => setWarehouses(r.data));
    catalogApi.products
      .list({ pageSize: 100 })
      .then((r) => setProducts(r.data));
  }, []);

  if (!can("inventory.adjust")) {
    return (
      <div className="empty">
        برای اصلاح موجودی مجوز «inventory.adjust» لازم است.
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const key = crypto.randomUUID();
      await inventoryApi.adjust(
        {
          warehouseId: form.warehouseId,
          productId: form.productId,
          quantityDelta: form.quantityDelta,
          note: form.note,
          ...(form.unitCost ? { unitCost: form.unitCost } : {}),
        },
        key,
      );
      toast("اصلاح موجودی ثبت شد ✅", "success");
      setForm({
        warehouseId: "",
        productId: "",
        quantityDelta: "",
        note: "",
        unitCost: "",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا";
      setFormError(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="اصلاح موجودی"
        sub="برای شمارشگری، ضایعات یا اصلاح مغایرت — با دلیل اجباری و ثبت در ممیزی"
      />
      <div className="card" style={{ maxWidth: 640 }}>
        {formError ? (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⛔</span>
            <span>{formError}</span>
          </div>
        ) : null}
        {showResult ? (
          <div
            className="alert"
            role="status"
            style={{
              background: "var(--success-soft)",
              border: "1px solid var(--success)",
              color: "var(--success)",
            }}
          >
            <span>✓ اصلاح موجودی با موفقیت ثبت شد.</span>
          </div>
        ) : null}
        <form onSubmit={submit}>
          <Field label="انبار">
            <select
              className="select"
              value={form.warehouseId}
              required
              onChange={(e) =>
                setForm({ ...form, warehouseId: e.target.value })
              }
            >
              <option value="">انتخاب کنید…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="کالا">
            <select
              className="select"
              value={form.productId}
              required
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">انتخاب کنید…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 14px",
            }}
          >
            <Field label="تغییر مقدار (منفی برای کسر)">
              <input
                className="input"
                dir="ltr"
                inputMode="decimal"
                required
                value={form.quantityDelta}
                onChange={(e) =>
                  setForm({ ...form, quantityDelta: e.target.value })
                }
              />
            </Field>
            <Field label="بهای واحد (اختیاری)">
              <input
                className="input"
                dir="ltr"
                inputMode="decimal"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              />
            </Field>
          </div>
          <Field label="دلیل اصلاح (حداکثر ۵۰۰ کاراکتر)">
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              required
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "در حال ثبت…" : "ثبت اصلاح"}
          </button>
        </form>
      </div>
    </>
  );
}
