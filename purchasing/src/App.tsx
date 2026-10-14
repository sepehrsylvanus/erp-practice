import { useCallback, useEffect, useState, type FormEvent } from "react";
import { catalogApi, purchasingApi } from "@erp/shared-api";
import type {
  Party,
  Product,
  PurchaseOrder,
  Ref,
  Warehouse,
} from "@erp/shared-api";
import {
  DataTable,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  PURCHASE_STATUS,
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
  unitCost: string;
  taxRate: string;
}

export default function PurchaseOrdersPage() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [busyId, setBusyId] = useState("");
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Ref[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    supplierId: "",
    branchId: "",
    warehouseId: "",
    currency: "",
  });
  const [lines, setLines] = useState<Line[]>([
    {
      productId: "",
      description: "",
      quantity: "1",
      unitCost: "0",
      taxRate: "0",
    },
  ]);

  useEffect(() => {
    catalogApi.suppliers
      .list({ pageSize: 100 })
      .then((r) => setSuppliers(r.data));
    catalogApi.warehouses().then((r) => setWarehouses(r.data));
    catalogApi.branches().then((r) => setBranches(r.data));
    catalogApi.products
      .list({ pageSize: 100 })
      .then((r) => setProducts(r.data));
  }, []);

  const fetcher = useCallback(
    (p: number) => {
      return purchasingApi.orders({ page: p, pageSize: 25 });
    },
    [version],
  );

  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery<PurchaseOrder>(fetcher, page);

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
      await purchasingApi.create({
        ...form,
        lines: lines.map((l) => ({
          ...l,
          description:
            l.description ||
            products.find((p) => p.id === l.productId)?.name ||
            "",
        })),
      });
      toast.success("سفارش خرید ساخته شد ✅");
      setCreating(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      title: "شماره",
      render: (r) => <code dir="ltr">{r.number}</code>,
    },
    {
      key: "supplier",
      title: "تأمین‌کننده",
      render: (r) => `${r.supplier.code} — ${r.supplier.name}`,
    },
    { key: "orderDate", title: "تاریخ", render: (r) => dateOnly(r.orderDate) },
    {
      key: "status",
      title: "وضعیت",
      render: (r) => <StatusBadge map={PURCHASE_STATUS} value={r.status} />,
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
        <>
          {r.status === "DRAFT" && can("purchasing.orders.approve") && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={busyId === r.id}
              onClick={() =>
                act(
                  r.id,
                  () => purchasingApi.approve(r.id),
                  "سفارش خرید تأیید شد ✅",
                )
              }
            >
              تأیید
            </button>
          )}
          {(r.status === "APPROVED" || r.status === "PARTIALLY_RECEIVED") &&
            can("purchasing.orders.write") && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setReceiving(r)}
              >
                دریافت…
              </button>
            )}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="سفارش‌های خرید"
        sub="ثبت، تأیید و دریافت کالا از تأمین‌کننده"
        actions={
          can("purchasing.orders.write") && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCreating(true)}
            >
              ＋ سفارش جدید
            </button>
          )
        }
      />
      {listError ? (
        <ErrorState
          title="سفارش‌ها بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="سفارشی ثبت نشده"
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
        <Modal title="سفارش خرید جدید" onClose={() => setCreating(false)}>
          <form onSubmit={submitOrder}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="تأمین‌کننده">
                <select
                  className="select"
                  required
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                >
                  <option value="">انتخاب کنید…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </Field>{" "}
              <Field label="تأمین‌کننده">
                <select
                  className="select"
                  required
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm({ ...form, supplierId: e.target.value })
                  }
                >
                  <option value="">انتخاب کنید…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </Field>{" "}
              <Field label="انبار">
                <select
                  className="select"
                  required
                  value={form.warehouseId}
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
              </Field>{" "}
              <Field label="ارز (با ارز پیش‌فرض شرکت یکی باشد)">
                <input
                  className="input"
                  dir="ltr"
                  required
                  maxLength={3}
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
                </Field>{" "}
                <Field label="بهای واحد">
                  <input
                    className="input"
                    dir="ltr"
                    inputMode="decimal"
                    placeholder="بهای واحد"
                    required
                    value={line.unitCost}
                    onChange={(e) => {
                      const next = [...lines];
                      next[index] = { ...line, unitCost: e.target.value };
                      setLines(next);
                    }}
                  />
                </Field>{" "}
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
                  className="btn btn-ghost btn-sm"
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
                    unitCost: "0",
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
      {receiving && (
        <Modal
          title={`دریافت سفارش ${receiving.number}`}
          onClose={() => setReceiving(null)}
        >
          <ReceiveForm
            order={receiving}
            onDone={() => {
              setReceiving(null);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function ReceiveForm({
  order,
  onDone,
}: {
  order: PurchaseOrder;
  onDone: () => void;
}) {
  const [number, setNumber] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await purchasingApi.receive(order.id, {
        number,
        lines: order.lines
          .filter((l) => Number(qtys[l.id] ?? 0) > 0)
          .map((l) => ({
            purchaseOrderLineId: l.id,
            quantity: qtys[l.id],
            ...(costs[l.id] ? { unitCost: costs[l.id] } : {}),
          })),
      });
      toast.success("رسید خرید ثبت شد ✅");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="شماره‌ی رسید (مثل RC-1001)">
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
        const remaining = Number(l.quantity) - Number(l.receivedQuantity);
        return (
          <div
            key={l.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 10,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span>
              {l.product.name} <code dir="ltr">{l.product.sku}</code>
            </span>{" "}
            <span className="num">باقی‌مانده: {qty(remaining)}</span>
            <input
              className="input"
              dir="ltr"
              inputMode="decimal"
              placeholder="تعداد دریافت"
              value={qtys[l.id] ?? ""}
              onChange={(e) => setQtys({ ...qtys, [l.id]: e.target.value })}
            />{" "}
            <input
              className="input"
              dir="ltr"
              inputMode="decimal"
              placeholder="بهای واحد (اختیاری)"
              value={costs[l.id] ?? ""}
              onChange={(e) => setCosts({ ...costs, [l.id]: e.target.value })}
            />
          </div>
        );
      })}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          انصراف
        </button>
        <button className="btn btn-primary" disabled={busy}>
          ثبت دریافت
        </button>
      </div>
    </form>
  );
}
