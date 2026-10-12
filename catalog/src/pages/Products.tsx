import type { Product } from "@erp/shared-api";
import { catalogApi } from "@erp/shared-api";
import { useSession } from "@erp/shared-auth";
import {
  DataTable,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  money,
  usePagedQuery,
  useToast,
  type Column,
} from "@erp/shared-ui";
import { useCallback, useState, type FormEvent } from "react";

const EMPTY = {
  sku: "",
  name: "",
  unit: "",
  salePrice: "",
  purchasePrice: "",
  reorderPoint: "",
};

export default function ProductsPage() {
  const { can } = useSession();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [version, setVersion] = useState(0);

  const fetcher = useCallback(
    (p: number) => catalogApi.products.list({ page: p, pageSize: 25, search }),
    [search, version],
  );
  const {
    rows,
    total,
    loading,
    error: listError,
  } = usePagedQuery(fetcher, page);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (creating) {
        await catalogApi.products.create(form);
        toast("کالا ساخته شد ✅", "success");
      } else if (editing) {
        await catalogApi.products.update(editing.id, form);
        toast("کالا بروزرسانی شد ✅", "success");
      }
      setCreating(false);
      setEditing(null);
      setPage(1);
      setVersion((v) => v + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : "خطا", "error");
    }
  }

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(product: Product) {
    setForm({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      salePrice: product.salePrice ?? "",
      purchasePrice: product.purchasePrice ?? "",
      reorderPoint: product.reorderPoint ?? "",
    });
    setEditing(product);
    setCreating(false);
  }

  const columns: Column<Product>[] = [
    {
      key: "sku",
      title: "کد کالا (SKU)",
      render: (r) => <code dir="ltr">{r.sku}</code>,
    },
    { key: "name", title: "نام" },
    { key: "unit", title: "واحد" },
    {
      key: "salePrice",
      title: "قیمت فروش",
      numeric: true,
      render: (r) => (r.salePrice ? money(r.salePrice) : "—"),
    },
    {
      key: "purchasePrice",
      title: "بهای خرید",
      numeric: true,
      render: (r) => (r.purchasePrice ? money(r.purchasePrice) : "—"),
    },
    {
      key: "actions",
      title: "",
      render: (r) =>
        can("catalog.products.write") ? (
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
            ویرایش
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="کالاها"
        sub="مدیریت اقلام کالا، قیمت و نقطه‌ی سفارش"
        actions={
          can("catalog.products.write") && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              ＋ کالای جدید
            </button>
          )
        }
      />
      <div className="toolbar">
        <SearchInput
          value={searchInput}
          onChange={(v) => {
            setSearchInput(v);
            setPage(1);
            setSearch(v.trim());
          }}
          placeholder="جست‌وجو در نام یا SKU…"
        />
      </div>
      {listError ? (
        <ErrorState
          title="کالاها بارگذاری نشد"
          message={listError}
          onRetry={() => setVersion((v) => v + 1)}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyText="کالایی یافت نشد"
          />
          <Pagination
            page={page}
            pageSize={25}
            total={total}
            onPage={setPage}
          />
        </>
      )}

      {(creating || editing) && (
        <Modal
          title={creating ? "ویرایش" : `کالای جدید ${editing!.name}`}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <form onSubmit={submit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 14px",
              }}
            >
              <Field label="SKU (حروف بزرگ، عدد، نقطه، خط تیره)">
                <input
                  className="input"
                  dir="ltr"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  pattern="[A-Z0-9._-]{2,32}"
                  required
                />
              </Field>
              <Field label="نام کالا">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={160}
                  required
                />
              </Field>
              <Field label="واحد شمارش">
                <input
                  className="input"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  maxLength={20}
                  required
                />
              </Field>
              <Field label="قیمت فروش">
                <input
                  className="input"
                  dir="ltr"
                  inputMode="decimal"
                  value={form.salePrice}
                  onChange={(e) =>
                    setForm({ ...form, salePrice: e.target.value })
                  }
                />
              </Field>
              <Field label="بهای خرید">
                <input
                  className="input"
                  dir="ltr"
                  inputMode="decimal"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm({ ...form, purchasePrice: e.target.value })
                  }
                />
              </Field>
              <Field label="نقطه‌ی سفارش">
                <input
                  className="input"
                  dir="ltr"
                  inputMode="decimal"
                  value={form.reorderPoint}
                  onChange={(e) =>
                    setForm({ ...form, reorderPoint: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="model-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
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
