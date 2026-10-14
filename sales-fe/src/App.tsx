import { useCallback, useEffect, useState, type FormEvent } from "react";
import { catalogApi, salesApi } from "@erp/shared-api";
import type {
  Party,
  Product,
  Ref,
  SalesOrder,
  Warehouse,
} from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SALES_STATUS,
  StatusBadge,
  dateOnly,
  money,
  qty,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";
import { useSession } from "@erp/shared-auth";
import { toast } from "react-toastify";

interface Line {
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

export default function SalesOrderPage() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [shipping, setShipping] = useState<SalesOrder | null>(null);
  const [busyId, setBusyId] = useState("");

  const [customers, setCustomers] = useState<Party[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Ref[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    customerId: "",
    branchId: "",
    warehouseId: "",
    currency: "",
  });
  const [lines, setLines] = useState([
    {
      productId: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
      taxRate: "0",
    },
  ]);

  useEffect(() => {
    catalogApi.customers
      .list({ pageSize: 100 })
      .then((r) => setCustomers(r.data));
    catalogApi.warehouses().then((r) => setWarehouses(r.data));
    catalogApi.branches().then((r) => setBranches(r.data));
    catalogApi.products
      .list({ pageSize: 100 })
      .then((r) => setProducts(r.data));
  }, []);

  const fetcher = useCallback(
    (p: number) => {
      return salesApi.orders({ page: p, pageSize: 25 });
    },
    [version],
  );
  const { rows, total, loading } = usePagedQuery<SalesOrder>(fetcher, page);

  function reload() {
    setVersion((v) => v + 1);
  }
  async function act(id: string, fn: () => Promise<unknown>, okText: string) {
    setBusyId(id);
    try {
      await fn();
      toast.success(okText);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusyId("");
    }
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    try {
      await salesApi.create({
        ...form,
        lines: lines.map((l) => ({
          ...l,
          description:
            l.description ||
            products.find((p) => p.id === l.productId)?.name ||
            "",
        })),
      });
      toast.success("سفارش فروش ساخته شد ✅");
      setCreating(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  }

  const columns: Column<SalesOrder>[] = [
    {
      key: "number",
      title: "شماره",
      render: (r) => <code dir="ltr">{r.number}</code>,
    },
    {
      key: "customer",
      title: "مشتری",
      render: (r) => `${r.customer.code} — ${r.customer.name}`,
    },
    { key: "orderDate", title: "تاریخ", render: (r) => dateOnly(r.orderDate) },
    {
      key: "status",
      title: "وضعیت",
      render: (r) => <StatusBadge map={SALES_STATUS} value={r.status} />,
    },
    {
      key: "totalAmount",
      title: "مبلغ کل",
      numeric: true,
      render: (r) => <b>{money(r.totalAmount, r.currency)}</b>,
    },
    {
      key: "actions",
      title: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }}>
          {r.status === "DRAFT" && can("sales.order.approve") && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={busyId === r.id}
              onClick={() =>
                act(r.id, () => salesApi.confirm(r.id), "سفارش تأیید شد ✅")
              }
            >
              تأیید
            </button>
          )}
          {(r.status === "CONFIRMED" || r.status === "PARTIALLY_SHIPPED") &&
            can("sales.order.approve") && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShipping(r)}
              >
                ارسال…
              </button>
            )}
        </div>
      ),
    },
  ];

  return (
    <>
      <h1 className="page-title">سفارش‌های فروش</h1>
      <p className="page-sub">ثبت، تأیید (رزرو موجودی) و ارسال کالا</p>
      <div className="toolbar">
        <div className="spacer" />
        {can("sales.orders.write") && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + سفارش جدید
          </button>
        )}
      </div>
      <button className="btn btn-primary" onClick={() => setCreating(true)}>
        + سفارش جدید
      </button>

      {creating && (
        <Modal title="سفارش فروش جدید" onClose={() => setCreating(false)}>
          <form onSubmit={submitOrder}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="مشتری">
                <select
                  className="select"
                  required
                  value={form.customerId}
                  onChange={(e) =>
                    setForm({ ...form, customerId: e.target.value })
                  }
                >
                  <option value="">انتخاب…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="شعبه">
                <select
                  className="select"
                  required
                  value={form.branchId}
                  onChange={(e) =>
                    setForm({ ...form, branchId: e.target.value })
                  }
                >
                  <option value="">انتخاب…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="انبار">
                <select
                  className="select"
                  required
                  value={form.warehouseId}
                  onChange={(e) =>
                    setForm({ ...form, warehouseId: e.target.value })
                  }
                >
                  <option value="">انتخاب…</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </Field>{" "}
              <Field label="ارز (با ارز پیش‌فرض شرکت یکی باشد)">
                <input
                  className="input"
                  dir="ltr"
                  maxLength={3}
                  placeholder="IRR"
                  required
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value.toUpperCase() })
                  }
                />
              </Field>
            </div>

            <h4>اقلام سفارش</h4>

            {lines.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                  gap: 8,
                  alignItems: "end",
                  marginBottom: 8,
                }}
              >
                <Field label="کالا">
                  <select
                    className="select"
                    required
                    value={line.productId}
                    onChange={(e) => {
                      const next = [...lines];
                      next[index] = { ...line, productId: e.target.value };
                      setLines(next);
                    }}
                  >
                    <option value="">کالا…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="تعداد">
                  <input
                    className="input"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="تعداد"
                    required
                    value={line.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[index] = { ...line, quantity: e.target.value };
                      setLines(next);
                    }}
                  />
                </Field>
                <Field label="قیمت واحد">
                  <input
                    className="input"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="قیمت واحد"
                    required
                    value={line.unitPrice}
                    onChange={(e) => {
                      const next = [...lines];
                      next[index] = { ...line, unitPrice: e.target.value };
                      setLines(next);
                    }}
                  />
                </Field>
                <Field label="مالیات٪">
                  <input
                    className="input"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="مالیات٪"
                    value={line.taxRate}
                    onChange={(e) => {
                      const next = [...lines];
                      next[index] = { ...line, taxRate: e.target.value };
                      setLines(next);
                    }}
                  />
                </Field>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    productId: "",
                    description: "",
                    quantity: "1",
                    unitPrice: "0",
                    taxRate: "0",
                  },
                ])
              }
            >
              + افزودن قلم
            </button>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCreating(false)}
              >
                انصراف
              </button>
              <button className="btn btn-primary">ثبت سفارش</button>
            </div>
          </form>
        </Modal>
      )}

      {shipping && (
        <Modal
          title={`ارسال سفارش ${shipping.number}`}
          onClose={() => setShipping(null)}
        >
          <ShipmentForm
            order={shipping}
            onDone={() => {
              setShipping(null);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ShipmentForm({
  order,
  onDone,
}: {
  order: SalesOrder;
  onDone: () => void;
}) {
  const [number, setNumber] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await salesApi.ship(order.id, {
        number,
        lines: order.lines
          .filter((l) => Number(qtys[l.id] ?? 0) > 0)
          .map((l) => ({ salesOrderLineId: l.id, quantity: qtys[l.id] })),
      });
      toast.success("حواله‌ی ارسال ثبت شد ✅");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="شماره‌ی حواله (مثل SH-1001)">
        <input
          className="input"
          dir="ltr"
          required
          value={number}
          pattern="[A-Z0-9._-]{2,40}"
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
        />
      </Field>
      {order.lines.map((l) => {
        const remaining = Number(l.quantity) - Number(l.shippedQuantity);
        return (
          <div
            key={l.id}
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 1fr 1fr",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span>
              {l.product.name} <code dir="ltr">{l.product.sku}</code>
            </span>
            <span className="num">باقی‌مانده: {qty(remaining)}</span>
            <input
              className="input"
              dir="ltr"
              inputMode="decimal"
              placeholder="تعداد ارسال"
              value={qtys[l.id] ?? ""}
              onChange={(e) => setQtys({ ...qtys, [l.id]: e.target.value })}
            />
          </div>
        );
      })}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          انصراف
        </button>
        <button className="btn btn-primary" disabled={busy}>
          ثبت ارسال
        </button>
      </div>
    </form>
  );
}
