"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/useCompany";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { LangToggle } from "@/components/shell/LangToggle";

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--bd)",
  background: "var(--s2)", color: "var(--tx)", fontSize: 14, fontFamily: "inherit", outline: "none",
};
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 };

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

  useEffect(() => {
    if (!company?.id) return;
    fetch(`/api/companies/${company.id}`).then((r) => r.json()).then((d) =>
      setForm({ name: d.name || "", nameAr: d.nameAr || "", vatNumber: d.vatNumber || "", crNumber: d.crNumber || "", address: d.address || "" }),
    ).catch(() => {});
    fetch(`/api/ai/ingest`).then((r) => r.json()).then((d) => setChunks(d.totalGlobal ?? null)).catch(() => {});
  }, [company?.id]);

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

  async function reingest() {
    setIngesting(true);
    try {
      const res = await fetch("/api/ai/ingest", { method: "POST" });
      const d = await res.json();
      setChunks(d.totalGlobal ?? chunks);
    } finally { setIngesting(false); }
  }

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
        <div style={{ fontSize: 13, color: "var(--t3)" }}>You&apos;re on the free sandbox plan. Paid plans are coming soon.</div>
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
