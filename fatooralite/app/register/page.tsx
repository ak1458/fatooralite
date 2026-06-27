"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 11,
  border: "1px solid var(--bd)",
  background: "var(--s2)",
  color: "var(--tx)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--t3)",
  marginBottom: 5,
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "", vatNumber: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 20,
          padding: 32,
          border: "1px solid var(--bd)",
          background: "var(--s1)",
          boxShadow: "var(--sh)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px -6px var(--ac)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#04130d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--fdisp)" }}>Create your company</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>Start issuing ZATCA-compliant invoices</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <div style={{ marginBottom: 13 }}>
            <label style={labelStyle}>Your name</label>
            <input value={form.name} onChange={set("name")} style={inputStyle} required autoComplete="name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 13 }}>
            <div>
              <label style={labelStyle}>Work email</label>
              <input type="email" value={form.email} onChange={set("email")} style={inputStyle} required autoComplete="email" />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={set("password")} style={inputStyle} required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <div style={{ marginBottom: 13 }}>
            <label style={labelStyle}>Company name</label>
            <input value={form.companyName} onChange={set("companyName")} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>VAT number (15 digits)</label>
            <input
              value={form.vatNumber}
              onChange={set("vatNumber")}
              style={{ ...inputStyle, fontFamily: "var(--fmono)" }}
              required
              inputMode="numeric"
              maxLength={15}
              placeholder="3XXXXXXXXXXXXX3"
            />
          </div>

          {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "12px 18px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "#04130d",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Creating your account…" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--t3)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--ac)", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
