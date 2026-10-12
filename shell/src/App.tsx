import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { lazyProvider } from "./mf";
import { initSession, useSession } from "@erp/shared-auth";
import { ToastHost } from "@erp/shared-ui";
import "@fontsource/vazirmatn";

initSession();

const LoginPage = lazyProvider("auth", "App");
const DashboardPage = lazyProvider("dashboard", "App");
const ProductsPage = lazyProvider("catalog", "Products");
const CustomersPage = lazyProvider("catalog", "Customers");
const SuppliersPage = lazyProvider("catalog", "Suppliers");
const BalancesPage = lazyProvider("inventory", "Balances");
const MovementsPage = lazyProvider("inventory", "Movements");
const AdjustPage = lazyProvider("inventory", "Adjust");
const PurchaseOrdersPage = lazyProvider("purchasing", "App");
const SalesOrdersPage = lazyProvider("sales", "App");
const InvoicesPage = lazyProvider("finance", "Invoices");
const PaymentsPage = lazyProvider("finance", "Payments");
const TrialBalancePage = lazyProvider("finance", "TrialBalance");
const ReportsPage = lazyProvider("reports", "App");
const AuditPage = lazyProvider("admin", "App");

class RemoteBoundary extends Component<
  { name: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="card" role="alert" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>🧩</div>
          <b>ماژول «{this.props.name}» در دسترس نیست</b>
          <p style={{ color: "var(--muted)" }}>
            سرور dev آن ماژول را اجرا کنید یا استقرار آن را بررسی کنید.
          </p>
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="skeleton" style={{ height: 220 }} />}>
        {this.props.children}
      </Suspense>
    );
  }
}

const MENU = [
  {
    label: "عملیات",
    items: [
      { to: "/dashboard", text: "داشبورد", icon: "📊" },
      {
        to: "/sales/orders",
        text: "سفارش‌های فروش",
        icon: "🧾",
        permission: "sales.orders.read",
      },
      {
        to: "/purchasing/orders",
        text: "سفارش‌های خرید",
        icon: "🛒",
        permission: "purchasing.orders.read",
      },
    ],
  },
  {
    label: "کاتالوگ و انبار",
    items: [
      {
        to: "/catalog/products",
        text: "کالاها",
        icon: "📦",
        permission: "catalog.products.read",
      },
      {
        to: "/catalog/customers",
        text: "مشتریان",
        icon: "👥",
        permission: "catalog.parties.read",
      },
      {
        to: "/catalog/suppliers",
        text: "تأمین‌کنندگان",
        icon: "🚚",
        permission: "catalog.parties.read",
      },
      {
        to: "/inventory/balances",
        text: "موجودی انبار",
        icon: "🏬",
        permission: "inventory.balances.read",
      },
      {
        to: "/inventory/movements",
        text: "گردش کالا",
        icon: "🔁",
        permission: "inventory.balances.read",
      },
      {
        to: "/inventory/adjustments",
        text: "اصلاح موجودی",
        icon: "✏️",
        permission: "inventory.adjust",
      },
    ],
  },
  {
    label: "مالی و گزارش",
    items: [
      {
        to: "/finance/invoices",
        text: "فاکتورها",
        icon: "📄",
        permission: "finance.invoices.read",
      },
      {
        to: "/finance/payments",
        text: "پرداخت‌ها",
        icon: "💰",
        permission: "finance.invoices.read",
      },
      {
        to: "/finance/trial-balance",
        text: "تراز آزمایشی",
        icon: "⚖️",
        permission: "finance.reports.read",
      },
      {
        to: "/reports",
        text: "گزارش‌های مدیریتی",
        icon: "📈",
        permission: "finance.reports.read",
      },
      {
        to: "/admin/audit",
        text: "گزارش ممیزی",
        icon: "🔍",
        permission: "admin.users.manage",
      },
    ],
  },
] as const;

function ShellLayout() {
  const { user, logout } = useSession();
  const [navOpen, setNavOpen] = useState(false);
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "";
    try {
      localStorage.setItem("erp-theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp-theme");
      if (saved === "dark") setDark(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const initial =
    (user?.displayName?.trim()?.charAt(0) ||
      user?.email?.trim()?.charAt(0) ||
      "؟").toUpperCase();

  return (
    <div className={`app-layout ${navOpen ? "nav-open" : ""}`}>
      <button
        className="sidebar-overlay"
        aria-label="بستن منو"
        onClick={() => setNavOpen(false)}
      />
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">⚡</span>
          <span>ERP Platform</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {MENU.map((group) => {
            const visible = group.items.filter(
              (item) =>
                !("permission" in item) ||
                user?.permissions.includes(item.permission),
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? "active" : ""}`
                    }
                  >
                    <span>{item.icon}</span> {item.text}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{initial}</span>
            <span className="who">
              <b>{user?.displayName}</b>
              <span>{user?.companyName}</span>
            </span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDark((d) => !d)}
            aria-label="تغییر تم"
          >
            {dark ? "☀️ حالت روشن" : "🌙 حالت تیره"}
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-user">
            <button
              className="burger"
              onClick={() => setNavOpen((o) => !o)}
              aria-label="بازکردن منو"
            >
              ☰
            </button>
            <span className="avatar">{initial}</span>
            <div className="who">
              <b>{user?.companyName}</b>
              <span>{user?.displayName}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="badge green">● آنلاین</span>
            <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
              خروج ←
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useSession();
  if (loading) return <div className="skeleton" style={{ height: "100vh" }} />;

  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <RemoteBoundary name="ورود">
              <LoginPage />
            </RemoteBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RemoteBoundary name="داشبورد">
              <DashboardPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="catalog/products"
          element={
            <RemoteBoundary name="کالاها">
              <ProductsPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="catalog/customers"
          element={
            <RemoteBoundary name="مشتریان">
              <CustomersPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="catalog/suppliers"
          element={
            <RemoteBoundary name="تأمین‌کنندگان">
              <SuppliersPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="inventory/balances"
          element={
            <RemoteBoundary name="موجودی">
              <BalancesPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="inventory/movements"
          element={
            <RemoteBoundary name="گردش کالا">
              <MovementsPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="inventory/adjustments"
          element={
            <RemoteBoundary name="اصلاح موجودی">
              <AdjustPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="purchasing/orders"
          element={
            <RemoteBoundary name="خرید">
              <PurchaseOrdersPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="sales/orders"
          element={
            <RemoteBoundary name="فروش">
              <SalesOrdersPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="finance/invoices"
          element={
            <RemoteBoundary name="فاکتورها">
              <InvoicesPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="finance/payments"
          element={
            <RemoteBoundary name="پرداخت‌ها">
              <PaymentsPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="finance/trial-balance"
          element={
            <RemoteBoundary name="تراز">
              <TrialBalancePage />
            </RemoteBoundary>
          }
        />
        <Route
          path="reports"
          element={
            <RemoteBoundary name="گزارش‌ها">
              <ReportsPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RemoteBoundary name="ممیزی">
              <AuditPage />
            </RemoteBoundary>
          }
        />
        <Route
          path="*"
          element={
            <div className="empty">
              <div className="icon">🧭</div>صفحه یافت نشد
            </div>
          }
        />
      </Route>
      <Route path="/login" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ToastHost>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastHost>
  );
}

export default App;
