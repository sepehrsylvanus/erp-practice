import { useState, type FormEvent } from "react";
import { useSession } from "@erp/shared-auth";
import { Field, useToast } from "@erp/shared-ui";

export default function LoginPage() {
  const { login } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      toast("Welcome");
      window.location.assign("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Login was unsuccessful",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="card login-cad" onSubmit={onSubmit}>
        <div className="brand-row">
          <span className="logo">⚡</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>ورود به ERP</div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>ورود به ERP</div>
          </div>
        </div>
        <Field label="ایمیل سازمانی">
          <input
            className="input"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </Field>
        <Field label="گذرواژه" error={error || undefined}>
          <input
            className="input"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>
        <button
          className="btn btn-primary"
          disabled={busy}
          style={{ width: "100%", marginTop: 6 }}
        >
          {busy ? "ورود" : "در حال ورود..."}
        </button>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 12,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          نشست شما با cookie امن نگه‌داری می‌شود؛ گذرواژه هرگز در مرورگر ذخیره
          نمی‌شود.
        </p>
      </form>
    </div>
  );
}
