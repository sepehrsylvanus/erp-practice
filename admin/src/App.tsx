import { useCallback, useState } from "react";
import { adminApi, type AuditLog } from "@erp/shared-api";
import {
  DataTable,
  Pagination,
  dateTime,
  usePagedQuery,
  type Column,
} from "@erp/shared-ui";

export default function AdminPage() {
  const [page, setPage] = useState(1);
  const fetcher = useCallback(
    (p: number) => adminApi.auditLogs({ page: p }),
    [],
  );
  const { rows, total, loading } = usePagedQuery<AuditLog>(fetcher, page);
  const columns: Column<AuditLog>[] = [
    { key: "createdAt", title: "زمان", render: (r) => dateTime(r.createdAt) },
    {
      key: "actor",
      title: "کاربر",
      render: (r) => r.actor?.displayName ?? r.actor?.email ?? "سیستم",
    },
    {
      key: "action",
      title: "عمل",
      render: (r) => <span className="badge blue">{r.action}</span>,
    },
    {
      key: "entityType",
      title: "موجودیت",
      render: (r) => <code dir="ltr">{r.entityType}</code>,
    },
    {
      key: "entityId",
      title: "شناسه",
      render: (r) => <code dir="ltr">{r.entityId.slice(0, 8)}…</code>,
    },
  ];
  return (
    <>
      <h1 className="page-title">گزارش ممیزی</h1>
      <p className="page-sub">رویدادهای حساس سیستم — فقط خواندنی</p>
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyText="رویدادی ثبت نشده"
      />
      <Pagination page={page} pageSize={25} total={total} onPage={setPage} />
    </>
  );
}
