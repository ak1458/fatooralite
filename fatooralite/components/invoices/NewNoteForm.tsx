"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar } from "@/lib/format";
import { invoiceTotals } from "@/lib/zatca/money";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { Invoice } from "@prisma/client";

interface Company {
  id: string;
  name: string;
  vatNumber: string;
}
interface Line {
  description: string;
  quantity: number;
  unitPrice: number;
}
interface CustomerData {
  id: string;
  name: string;
  vatNumber: string | null;
}
interface ProductData {
  id: string;
  name: string;
  unitPrice: number;
}

const L = {
  titleCredit: { en: "New Credit Note", ar: "إشعار دائن جديد" },
  titleDebit: { en: "New Debit Note", ar: "إشعار مدين جديد" },
  company: { en: "Company", ar: "الشركة" },
  number: { en: "Note number", ar: "رقم الإشعار" },
  kind: { en: "Type", ar: "النوع" },
  standard: { en: "Standard", ar: "ضريبية" },
  simplified: { en: "Simplified", ar: "مبسطة" },
  origInv: { en: "Original Invoice", ar: "الفاتورة الأصلية" },
  reason: { en: "Reason for Note", ar: "سبب الإشعار" },
  customer: { en: "Select Customer", ar: "اختر العميل" },
  buyer: { en: "Buyer name", ar: "اسم العميل" },
  buyerVat: { en: "Buyer VAT", ar: "الرقم الضريبي للعميل" },
  lines: { en: "Line items", ar: "بنود الإشعار" },
  product: { en: "Select Product", ar: "اختر المنتج" },
  desc: { en: "Description", ar: "الوصف" },
  qty: { en: "Qty", ar: "الكمية" },
  price: { en: "Unit price", ar: "سعر الوحدة" },
  addLine: { en: "Add line", ar: "إضافة بند" },
  taxable: { en: "Taxable", ar: "الخاضع للضريبة" },
  vat: { en: "VAT (15%)", ar: "الضريبة (١٥٪)" },
  total: { en: "Total", ar: "الإجمالي" },
  submit: { en: "Create & Sign", ar: "إنشاء وتوقيع" },
  signing: { en: "Signing…", ar: "جارٍ التوقيع…" },
  success: { en: "Note signed", ar: "تم توقيع الإشعار" },
  uuid: { en: "UUID", ar: "المعرّف" },
  hash: { en: "Hash", ar: "البصمة" },
  status: { en: "Status", ar: "الحالة" },
  viewXml: { en: "View XML", ar: "عرض XML" },
  another: { en: "Create another", ar: "إنشاء أخرى" },
  submitClear: { en: "Submit to ZATCA", ar: "إرسال للهيئة" },
  submittingZatca: { en: "Submitting…", ar: "جارٍ الإرسال…" },
  cleared: { en: "Cleared by ZATCA", ar: "تمت الإجازة" },
  reported: { en: "Reported to ZATCA", ar: "تم الإبلاغ" },
  rejected: { en: "Rejected", ar: "مرفوضة" },
};

export function NewNoteForm({ type }: { type: "credit" | "debit" }) {
  const { lang } = useLang();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [number, setNumber] = useState("");
  const [kind, setKind] = useState<"standard" | "simplified">("standard");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerVat, setBuyerVat] = useState("");
  
  const [billingReferenceId, setBillingReferenceId] = useState("");
  const [instructionNote, setInstructionNote] = useState("");
  
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<null | {
    invoiceId: string;
    signed: { uuid: string; hash: string; xml: string; totals: { grandTotal: number } };
    status: string;
  }>(null);
  const [showXml, setShowXml] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearance, setClearance] = useState<null | { status: string; code: string; message: string }>(
    null,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNumber(genNumber(type));
  }, [type]);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d: { companies: Company[] }) => {
        setCompanies(d.companies);
        if (d.companies[0]) setCompanyId(d.companies[0].id);
      })
      .catch(() => setError("Failed to load companies"));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/customers?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => setCustomers(data.customers || []));
    fetch(`/api/products?companyId=${companyId}`)
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
    fetch(`/api/invoices?companyId=${companyId}&status=all`)
      .then(res => res.json())
      .then(data => setInvoices(data.invoices || []));
  }, [companyId]);

  const totals = invoiceTotals(lines.map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })));

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function handleProductSelect(i: number, productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateLine(i, { description: product.name, unitPrice: product.unitPrice });
    }
  }
  function addLine() {
    setLines((ls) => [...ls, { description: "", quantity: 1, unitPrice: 0 }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));
  }

  async function submit() {
    setError("");
    if (!billingReferenceId) return setError("Original invoice reference is required.");
    if (!instructionNote) return setError("Reason for note is required.");
    
    setSubmitting(true);
    try {
      const company = companies.find((c) => c.id === companyId);
      const input = {
        invoiceNumber: number,
        kind,
        documentType: type,
        issueDate: new Date().toISOString().slice(0, 10),
        issueTime: new Date().toISOString().slice(11, 19),
        seller: { name: company?.name ?? "", vatNumber: company?.vatNumber ?? "" },
        buyer: buyerName ? { name: buyerName, vatNumber: buyerVat || undefined } : undefined,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        billingReferenceId,
        instructionNote,
      };
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitToZatca(invoiceId: string) {
    setClearing(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/clear`, { method: "POST" });
      const data = await res.json();
      setClearance({
        status: data.status ?? "error",
        code: data.response?.code ?? "",
        message: data.response?.message ?? data.error ?? "",
      });
    } catch {
      setClearance({ status: "error", code: "", message: "Network error" });
    } finally {
      setClearing(false);
    }
  }

  const label = (k: keyof typeof L) => L[k][lang];
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid var(--bd)",
    background: "var(--s2)",
    color: "var(--tx)",
    fontSize: 13.5,
    fontFamily: "inherit",
  };

  if (result) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Card style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--acs)",
                color: "var(--ac)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="check" size={24} sw={2.4} />
            </span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--fdisp)" }}>
                {label("success")}
              </div>
              <div style={{ fontSize: 13, color: "var(--t3)" }}>{number}</div>
            </div>
          </div>
          <Row k={label("status")} v={result.status} mono />
          <Row k={label("uuid")} v={result.signed.uuid} mono />
          <Row k={label("hash")} v={result.signed.hash.slice(0, 32) + "…"} mono />
          <Row k={label("total")} v={sar(result.signed.totals.grandTotal, lang)} />

          {clearance && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 10,
                background:
                  clearance.status === "rejected" || clearance.status === "error"
                    ? "var(--dangs)"
                    : "var(--acs)",
                border: "1px solid var(--bd)",
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color:
                    clearance.status === "rejected" || clearance.status === "error"
                      ? "var(--dang)"
                      : "var(--ac)",
                }}
              >
                {clearance.status === "cleared"
                  ? label("cleared")
                  : clearance.status === "reported"
                    ? label("reported")
                    : label("rejected")}
                {clearance.code ? ` · ${clearance.code}` : ""}
              </div>
              {clearance.message && (
                <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 4 }}>{clearance.message}</div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {!clearance && (
              <button
                onClick={() => submitToZatca(result.invoiceId)}
                disabled={clearing}
                style={{ ...btnPrimary, opacity: clearing ? 0.7 : 1 }}
              >
                {clearing ? label("submittingZatca") : label("submitClear")}
              </button>
            )}
            <button onClick={() => setShowXml((s) => !s)} style={{ ...btnGhost }}>
              {label("viewXml")}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setShowXml(false);
                setClearance(null);
                setNumber(genNumber(type));
                setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
              }}
              style={{ ...btnGhost }}
            >
              {label("another")}
            </button>
          </div>
          {showXml && (
            <pre
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background: "var(--s2)",
                border: "1px solid var(--bd)",
                fontSize: 11,
                fontFamily: "var(--fmono)",
                color: "var(--t2)",
                overflowX: "auto",
                maxHeight: 280,
              }}
            >
              {result.signed.xml}
            </pre>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Card style={{ padding: 26 }}>
        <h1 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 700, fontFamily: "var(--fdisp)" }}>
          {type === "credit" ? label("titleCredit") : label("titleDebit")}
        </h1>

        <Field label={label("company")}>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={inputStyle}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.vatNumber}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={label("number")}>
            <input value={number} onChange={(e) => setNumber(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={label("kind")}>
            <select value={kind} onChange={(e) => setKind(e.target.value as "standard" | "simplified")} style={inputStyle}>
              <option value="standard">{label("standard")}</option>
              <option value="simplified">{label("simplified")}</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={label("origInv")}>
            <select 
              value={billingReferenceId}
              onChange={(e) => setBillingReferenceId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select Original Invoice --</option>
              {invoices.filter(i => i.documentType === "invoice").map((inv) => (
                <option key={inv.id} value={inv.invoiceNumber}>{inv.invoiceNumber} ({sar(inv.grandTotal, lang)})</option>
              ))}
            </select>
          </Field>
          <Field label={label("reason")}>
            <input value={instructionNote} onChange={(e) => setInstructionNote(e.target.value)} style={inputStyle} placeholder="e.g., Return / Adjustment" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={label("customer")}>
            <select 
              value={selectedCustomerId} 
              onChange={(e) => {
                const id = e.target.value;
                setSelectedCustomerId(id);
                const c = customers.find(x => x.id === id);
                if (c) {
                  setBuyerName(c.name);
                  setBuyerVat(c.vatNumber || "");
                } else {
                  setBuyerName("");
                  setBuyerVat("");
                }
              }} 
              style={inputStyle}
            >
              <option value="">-- Custom Buyer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={label("buyer")}>
              <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={label("buyerVat")}>
              <input value={buyerVat} onChange={(e) => setBuyerVat(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: 8, marginBottom: 8, fontSize: 12.5, fontWeight: 700, color: "var(--t3)" }}>
          {label("lines")}
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "150px 1fr 80px 110px 36px", gap: 8, marginBottom: 8 }}>
            <select onChange={(e) => handleProductSelect(i, e.target.value)} style={inputStyle}>
              <option value="">{label("product")}...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              placeholder={label("desc")}
              value={l.description}
              onChange={(e) => updateLine(i, { description: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder={label("qty")}
              value={l.quantity}
              onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder={label("price")}
              value={l.unitPrice}
              onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
              style={inputStyle}
            />
            <button onClick={() => removeLine(i)} style={{ ...btnGhost, padding: 0 }} aria-label="remove">
              ×
            </button>
          </div>
        ))}
        <button onClick={addLine} style={{ ...btnGhost, marginTop: 2 }}>
          + {label("addLine")}
        </button>

        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 12,
            background: "var(--s2)",
            border: "1px solid var(--bd)",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Stat k={label("taxable")} v={sar(totals.taxableAmount, lang)} />
          <Stat k={label("vat")} v={sar(totals.vatAmount, lang)} />
          <Stat k={label("total")} v={sar(totals.grandTotal, lang)} accent />
        </div>

        {error && <div style={{ marginTop: 14, color: "var(--dang)", fontSize: 13 }}>{error}</div>}

        <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, width: "100%", marginTop: 18, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? label("signing") : label("submit")}
        </button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--bd)" }}>
      <span style={{ fontSize: 12.5, color: "var(--t3)" }}>{k}</span>
      <span style={{ fontSize: 12.5, fontFamily: mono ? "var(--fmono)" : "inherit", color: "var(--tx)" }}>{v}</span>
    </div>
  );
}
function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 3 }}>{k}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--fdisp)", color: accent ? "var(--ac)" : "var(--tx)" }}>
        {v}
      </div>
    </div>
  );
}

function genNumber(type: "credit" | "debit"): string {
  const prefix = type === "credit" ? "CN" : "DN";
  return `${prefix}-2026-${Math.floor(10000 + Math.random() * 89999)}`;
}

const btnPrimary: React.CSSProperties = {
  padding: "11px 18px",
  borderRadius: 11,
  border: "none",
  background: "linear-gradient(150deg,var(--acb),var(--ac))",
  color: "#04130d",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
const btnGhost: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--bd)",
  background: "var(--s1)",
  color: "var(--t2)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
