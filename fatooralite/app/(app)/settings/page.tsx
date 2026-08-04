"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/useCompany";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { LangToggle } from "@/components/shell/LangToggle";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

interface Usage {
  used: number;
  limit: number | null;
}

interface BillingInfo {
  /** Resolved server-side — never inferred from the raw subscription row here,
   *  so this display cannot disagree with what the gates actually enforce. */
  plan: "trial" | "pro" | "expired";
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  planLimits: { invoicesPerMonth: number | null; branches: number | null; seats: number | null };
  invoiceUsage: Usage;
  branchUsage: Usage;
  seatUsage: Usage;
}

/** Reserved for Pro. Shown to trial and expired tenants, never hidden — a
 *  capability nobody can see is a capability nobody upgrades for. */
const PRO_FEATURES = [
  "Unlimited invoices per month",
  "Multiple branches and locations",
  "Unlimited team members",
  "AI assistant actions (create, issue and submit from chat)",
  "Bulk import and export",
  "API access",
  "Custom invoice branding",
  "Advanced reports",
];

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)",
  background: "var(--s2)", color: "var(--tx)", fontSize: 14, fontFamily: "inherit", outline: "none",
};
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 };

function UsageMeter({ label: text, usage }: { label: string; usage: Usage }) {
  const pct = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: "var(--t3)" }}>{text}</span>
        <span style={{ fontSize: 12.5, color: "var(--t2)", fontFamily: "var(--fmono)" }}>
          {usage.used} / {usage.limit ?? "unlimited"}
        </span>
      </div>
      <ProgressBar pct={pct} />
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, padding: 22, marginBottom: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: sub ? 2 : 14 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--t3)", marginBottom: 16 }}>{sub}</div>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { company } = useCompany();
  const [form, setForm] = useState({ name: "", nameAr: "", vatNumber: "", crNumber: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [chunks, setChunks] = useState<number | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const loadCompany = useCallback((id: string) => {
    return fetch(`/api/companies/${id}`).then((r) => r.json()).then((d) => {
      setForm({ name: d.name || "", nameAr: d.nameAr || "", vatNumber: d.vatNumber || "", crNumber: d.crNumber || "", address: d.address || "" });
      if (d.plan) {
        setBilling({
          plan: d.plan,
          trialDaysLeft: d.trialDaysLeft ?? null,
          trialEndsAt: d.trialEndsAt ?? null,
          currentPeriodEnd: d.currentPeriodEnd ?? null,
          planLimits: d.planLimits,
          invoiceUsage: d.invoiceUsage,
          branchUsage: d.branchUsage,
          seatUsage: d.seatUsage,
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!company?.id) return;
    loadCompany(company.id);
    fetch(`/api/ai/ingest`).then((r) => r.json()).then((d) => setChunks(d.totalGlobal ?? null)).catch(() => {});
    // Moyasar's redirect back to success_url races the webhook that
    // actually grants Pro (see app/api/billing/webhook/route.ts) — the
    // browser can land here before the server-to-server notification does.
    // One delayed refetch covers that window without polling indefinitely.
    if (new URLSearchParams(window.location.search).get("billing") === "success") {
      setMessage("Payment received — activating your plan…");
      setTimeout(() => loadCompany(company.id), 2500);
    }
  }, [company?.id, loadCompany]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setSaving(true); setMessage("");
    try {
      const res = await fetch(`/api/companies/${company?.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      setMessage(res.ok ? "Saved." : "Failed to save.");
    } finally { setSaving(false); }
  }

  async function startCheckout() {
    if (!company?.id) return;
    setCheckoutBusy(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error || "Could not start checkout.");
    } catch {
      setCheckoutError("Could not start checkout.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function reingest() {
    setIngesting(true);
    try {
      const res = await fetch("/api/ai/ingest", { method: "POST" });
      const d = await res.json();
      setChunks(d.totalGlobal ?? chunks);
    } finally { setIngesting(false); }
  }

  const plan = billing?.plan ?? "trial";
  const isPro = plan === "pro";
  const planLabel = { trial: "Trial", pro: "Pro", expired: "Trial ended" }[plan];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 22px" }}>Settings</h1>

      <Section title="Company" sub="Your legal business details used on every invoice.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Legal name</label><input style={input} value={form.name} onChange={set("name")} /></div>
          <div><label style={label}>Name (Arabic)</label><input style={input} value={form.nameAr} onChange={set("nameAr")} dir="rtl" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={label}>VAT number</label><input style={{ ...input, fontFamily: "var(--fmono)" }} value={form.vatNumber} onChange={set("vatNumber")} /></div>
          <div><label style={label}>CR number</label><input style={input} value={form.crNumber} onChange={set("crNumber")} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={label}>Address</label><input style={input} value={form.address} onChange={set("address")} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={save} disabled={saving} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {message && <span style={{ fontSize: 13, color: "var(--ac)" }}>{message}</span>}
        </div>
      </Section>

      <Section title="Appearance" sub="Theme and language. Applies across the whole app.">
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13.5, color: "var(--t2)" }}>Theme</span><ThemeToggle /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13.5, color: "var(--t2)" }}>Language</span><LangToggle /></div>
        </div>
      </Section>

      <Section title="AI assistant" sub="The assistant retrieves from a ZATCA knowledge base to answer questions.">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={reingest} disabled={ingesting} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--tx)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {ingesting ? "Rebuilding…" : "Rebuild knowledge base"}
          </button>
          <span style={{ fontSize: 13, color: "var(--t3)" }}>{chunks != null ? `${chunks} knowledge chunks indexed` : ""}</span>
        </div>
      </Section>

      <Section title="ZATCA & access">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SettingLink href="/integration" title="ZATCA Integration" desc="Connect your CSID, manage environment and certificates." />
          <SettingLink href="/users" title="Users & Roles" desc="Invite team members and manage permissions." />
          <SettingLink href="/notifications" title="Notifications" desc="Review compliance alerts." />
        </div>
      </Section>

      <Section title="Security" sub="Authentication is enforced. Sessions are signed and expire after 7 days.">
        <div style={{ fontSize: 13, color: "var(--t2)" }}>
          Private signing keys are encrypted at rest. To change your password, sign out and use “Forgot password”.
        </div>
      </Section>

      <Section title="Billing" sub="Your subscription and usage.">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, color: "var(--t2)" }}>
            Current plan
            {plan === "trial" && billing?.trialDaysLeft != null && (
              <span style={{ color: "var(--t3)", fontSize: 12.5 }}>
                {" — "}
                {billing.trialDaysLeft} day{billing.trialDaysLeft === 1 ? "" : "s"} left
                {billing.trialEndsAt ? `, ends ${new Date(billing.trialEndsAt).toLocaleDateString()}` : ""}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
              background: isPro ? "linear-gradient(150deg,var(--acb),var(--ac))" : "var(--s2)",
              color: isPro ? "#04130d" : plan === "expired" ? "var(--dang)" : "var(--t2)",
              border: isPro ? "none" : `1px solid ${plan === "expired" ? "var(--dang)" : "var(--bd)"}`,
            }}
          >
            {planLabel}
          </span>
        </div>

        {!isPro && billing && (
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <UsageMeter label="Invoices this month" usage={billing.invoiceUsage} />
            <UsageMeter label="Branches" usage={billing.branchUsage} />
            <UsageMeter label="Team members" usage={billing.seatUsage} />
          </div>
        )}

        {isPro ? (
          <div style={{ fontSize: 12.5, color: "var(--t3)" }}>
            {billing?.currentPeriodEnd
              ? `Renews or expires ${new Date(billing.currentPeriodEnd).toLocaleDateString()}.`
              : "Active."}
          </div>
        ) : (
          <>
            <button
              onClick={startCheckout}
              disabled={checkoutBusy}
              style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "#04130d",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
                opacity: checkoutBusy ? 0.7 : 1,
              }}
            >
              {checkoutBusy ? "Starting checkout…" : "Upgrade to Pro"}
            </button>
            {checkoutError && (
              <div style={{ fontSize: 12.5, color: "var(--dang)", marginTop: 8 }}>{checkoutError}</div>
            )}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t2)", marginBottom: 8 }}>
                What Pro unlocks
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                {PRO_FEATURES.map((f) => (
                  <li key={f} style={{ fontSize: 12.5, color: "var(--t3)" }}>
                    {f}
                  </li>
                ))}
              </ul>
              {plan === "expired" && (
                <div style={{ fontSize: 12.5, color: "var(--t3)", marginTop: 12 }}>
                  Your existing invoices and audit records remain available to view, download and export.
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      <Section title="Onboarding setup" sub="Re-run the setup wizard or edit individual steps.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/onboarding?reopen=true"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 15px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)",
              textDecoration: "none", color: "var(--tx)",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Reconfigure full setup</div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                Restart the 6-step wizard from the beginning. All current data will be pre-filled.
              </div>
            </div>
            <span style={{ color: "var(--t3)" }}>→</span>
          </Link>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {ONBOARDING_STEPS.map((step) => (
              step.key !== "finish" && step.key !== "zatca-connection" && step.key !== "branches" && (
                <Link
                  key={step.key}
                  href={`/onboarding?step=${step.key}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: 999, background: "var(--s2)", border: "1px solid var(--bd)",
                    textDecoration: "none", color: "var(--tx)", fontSize: 12.5, fontWeight: 500,
                  }}
                >
                  {step.label}
                </Link>
              )
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--t3)" }}>
            Jump directly to any completed step to update it — no need to redo the whole wizard.
          </div>
        </div>
      </Section>
    </div>
  );
}

function SettingLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", borderRadius: 11, background: "var(--s2)", border: "1px solid var(--bd)", textDecoration: "none" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--tx)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ color: "var(--t3)" }}>→</span>
    </Link>
  );
}
