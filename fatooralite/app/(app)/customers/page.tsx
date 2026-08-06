"use client";
import { useState } from "react";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, modalInput, modalLabel, modalPrimary } from "@/components/common/Modal";
import { Icon } from "@/components/ui/Icon";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

import type { Customer } from "@prisma/client";

export default function CustomersPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const [open, setOpen] = useState(false);
  const mobile = useMediaQuery(639);
  const { state, retry } = useAsyncData<Customer[]>(
    async (signal) => {
      const res = await fetch(`/api/customers?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
      const data = await res.json();
      return (data.customers ?? []) as Customer[];
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Customers</h1>
        <button
          onClick={() => setOpen(true)}
          disabled={!company?.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 11,
            border: "none",
            background: "linear-gradient(150deg,var(--acb),var(--ac))",
            color: "var(--on-ac)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 22px -10px var(--ac)",
          }}
        >
          <Icon name="plus" size={15} sw={2.4} />
          New Customer
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New customer">
        <CustomerForm
          companyId={company?.id ?? ""}
          onCreated={() => { setOpen(false); retry(); }}
        />
      </Modal>

      {!company?.id && !companyLoading ? (
        <NoCompanyState />
      ) : (
        <AsyncBoundary
          state={state}
          isEmpty={(rows) => rows.length === 0}
          empty={<EmptyState icon="customers" title="No customers yet" hint="Add a customer to use as an invoice buyer." />}
          onRetry={retry}
        >
          {(customers) => mobile ? (
            <div role="list" aria-label="Customers" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customers.map((c) => (
                <div key={c.id} role="listitem" style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 6 }}>
                    {c.vatNumber && <span style={{ fontSize: 12.5, color: "var(--t2)", fontFamily: "var(--fmono)" }}>VAT {c.vatNumber}</span>}
                    {c.city && <span style={{ fontSize: 12.5, color: "var(--t3)" }}>{c.city}</span>}
                    {c.email && <span style={{ fontSize: 12.5, color: "var(--t3)" }}>{c.email}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <div style={{ background: "var(--s1)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--bd)", minWidth: 600 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)" }}>
                      <th style={{ padding: "16px 20px", fontWeight: 500 }}>Name</th>
                      <th style={{ padding: "16px 20px", fontWeight: 500 }}>VAT Number</th>
                      <th style={{ padding: "16px 20px", fontWeight: 500 }}>City</th>
                      <th style={{ padding: "16px 20px", fontWeight: 500 }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--bd)", fontSize: 14 }}>
                        <td style={{ padding: "16px 20px", fontWeight: 500, color: "var(--tx)" }}>{c.name}</td>
                        <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.vatNumber || "-"}</td>
                        <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.city || "-"}</td>
                        <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{c.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AsyncBoundary>
      )}
    </div>
  );
}

function CustomerForm({ companyId, onCreated }: { companyId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", vatNumber: "", city: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: form.name,
          vatNumber: form.vatNumber || null,
          city: form.city || null,
          email: form.email || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not create customer");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create customer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="cust-name" style={modalLabel}>Name</label>
        <input id="cust-name" style={modalInput} value={form.name} onChange={set("name")} required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label htmlFor="cust-vat" style={modalLabel}>VAT number (optional)</label>
          <input id="cust-vat" style={{ ...modalInput, fontFamily: "var(--fmono)" }} value={form.vatNumber} onChange={set("vatNumber")} maxLength={15} inputMode="numeric" />
        </div>
        <div>
          <label htmlFor="cust-city" style={modalLabel}>City</label>
          <input id="cust-city" style={modalInput} value={form.city} onChange={set("city")} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="cust-email" style={modalLabel}>Email (optional)</label>
        <input id="cust-email" style={modalInput} type="email" value={form.email} onChange={set("email")} />
      </div>
      {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Saving…" : "Add customer"}
        </button>
      </div>
    </form>
  );
}
