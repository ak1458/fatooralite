"use client";
import { useState } from "react";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, modalInput, modalLabel, modalPrimary } from "@/components/common/Modal";
import { Icon } from "@/components/ui/Icon";

import type { Product } from "@prisma/client";

export default function ProductsPage() {
  const { company, isLoading: companyLoading } = useCompany();
  const [open, setOpen] = useState(false);
  const { state, retry } = useAsyncData<Product[]>(
    async (signal) => {
      const res = await fetch(`/api/products?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
      const data = await res.json();
      return (data.products ?? []) as Product[];
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Products</h1>
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
            color: "#04130d",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 22px -10px var(--ac)",
          }}
        >
          <Icon name="plus" size={15} sw={2.4} />
          New Product
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New product">
        <ProductForm companyId={company?.id ?? ""} onCreated={() => { setOpen(false); retry(); }} />
      </Modal>

      {!company?.id && !companyLoading ? (
        <NoCompanyState />
      ) : (
        <AsyncBoundary
          state={state}
          isEmpty={(rows) => rows.length === 0}
          empty={<EmptyState icon="products" title="No products yet" hint="Add a product to use as an invoice line item." />}
          onRetry={retry}
        >
          {(products) => (
            <div style={{ background: "var(--s1)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--bd)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bd)", fontSize: 13, color: "var(--t3)" }}>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>Name</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>SKU</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>Unit Price</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500 }}>VAT Category</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--bd)", fontSize: 14 }}>
                      <td style={{ padding: "16px 20px", fontWeight: 500, color: "var(--tx)" }}>{p.name}</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.sku || "-"}</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.unitPrice.toFixed(2)} SAR</td>
                      <td style={{ padding: "16px 20px", color: "var(--t2)" }}>{p.vatCategory}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </div>
  );
}

function ProductForm({ companyId, onCreated }: { companyId: string; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", sku: "", unitPrice: "", vatCategory: "S" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: form.name,
          sku: form.sku || null,
          unitPrice: Number(form.unitPrice) || 0,
          vatCategory: form.vatCategory,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not create product");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div style={{ marginBottom: 12 }}>
        <label style={modalLabel}>Name</label>
        <input style={modalInput} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={modalLabel}>SKU</label>
          <input style={modalInput} value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
        </div>
        <div>
          <label style={modalLabel}>Unit price</label>
          <input style={modalInput} type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} required />
        </div>
        <div>
          <label style={modalLabel}>VAT</label>
          <select style={modalInput} value={form.vatCategory} onChange={(e) => setForm((f) => ({ ...f, vatCategory: e.target.value }))}>
            <option value="S">Standard 15%</option>
            <option value="Z">Zero-rated</option>
            <option value="E">Exempt</option>
            <option value="O">Out of scope</option>
          </select>
        </div>
      </div>
      {error && <div style={{ color: "var(--dang)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={busy} style={{ ...modalPrimary, opacity: busy ? 0.7 : 1 }}>
          {busy ? "Saving…" : "Add product"}
        </button>
      </div>
    </form>
  );
}
