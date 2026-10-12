import { useState, type FormEvent } from "react";
import { useSession } from "@erp/shared-auth";
import { Field } from "@erp/shared-ui";

// ترجمه‌ی خطاهای انگلیسی بک‌اند به فارسی
const FA_ERROR: Array<[RegExp, string]> = [
  [/invalid email or password/i, "ایمیل یا گذرواژه اشتباه است."],
  [/no company access/i, "برای این کاربر هیچ شرکتی تعریف نشده است."],
  [/selected company/i, "این کاربر به شرکت انتخاب‌شده دسترسی ندارد."],
  [
    /throttle|too many|rate/i,
    "تلاش‌های زیادی داشتید؛ کمی بعد دوباره امتحان کنید.",
  ],
  [
    /network|fetch|failed/i,
    "ارتباط با سرور برقرار نشد. اتصال اینترنت یا سرور را بررسی کنید.",
  ],
];

function toFaMessage(message: string) {
  for (const [re, fa] of FA_ERROR) if (re.test(message)) return fa;
  return message || "ورود ناموفق بود. دوباره تلاش کنید.";
}

export default function LoginPage() {
  const { login } = useSession();
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // دکمه‌ی چشم 👁️
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(toFaMessage(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page" dir="rtl">
      <div className="login-split">
        <form className="card login-card" onSubmit={onSubmit}>
          <div className="brand-row">
            <span className="logo">⚡</span>
            <div>
              <div className="login-title">ورود به ERP</div>
              <div className="login-sub">ERP Platform · نسخه‌ی وب</div>
            </div>
          </div>
          {error ? (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">⛔</span>
              <span>{error}</span>
            </div>
          ) : null}
          <Field label="ایمیل سازمانی">
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                ✉️
              </span>
              <input
                className="input has-icon"
                type="email"
                dir="ltr"
                placeholder="you@company.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </Field>
          <Field label="گذرواژه">
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">
                🔒
              </span>
              <input
                className="input has-icon has-action"
                type={showPassword ? "text" : "password"}
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </Field>
          <button className="btn btn-primary login-submit" disabled={busy}>
            {busy ? "در حال ورود…" : "ورود به سامانه ←"}
          </button>
          <div className="demo-box">
            <b>🧪 حساب نمایشی</b>
            <div className="demo-row" dir="ltr">
              <code>admin@erp.local</code>
            </div>
            <span>گذرواژه را از مدیر سامانه بگیرید.</span>
          </div>
        </form>
        <aside className="login-hero" aria-hidden="true">
          <div className="hero-glow" />
          <div className="hero-inner">
            <span className="hero-logo">⚡</span>
            <h2>ERP Platform</h2>
            <p>فروش، خرید، انبار، مالی و گزارش — همه در یک سامانه‌ی یکپارچه.</p>
            <ul className="hero-list">
              <li>
                <b>✓</b> داشبورد لحظه‌ای فروش و انبار
              </li>
              <li>
                <b>✓</b> کنترل دسترسی بر اساس نقش
              </li>
              <li>
                <b>✓</b> گزارش‌های مدیریتی و تراز آزمایشی
              </li>
            </ul>
            <div className="hero-cards">
              <div className="hero-mini">
                <b>۹+</b>
                <span>ماژول عملیاتی</span>
              </div>
              <div className="hero-mini">
                <b>۲۴/۷</b>
                <span>دسترسی تحت وب</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export { LoginPage as App };
