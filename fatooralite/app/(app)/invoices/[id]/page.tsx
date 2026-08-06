"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar } from "@/lib/format";

interface Line { id: string; description: string; quantity: number; unitPrice: number; vatRate: number; netAmount: number; vatAmount: number }
interface Record_ { id: string; action: string; status: string; responseCode: string | null; message: string | null; createdAt: string }
interface AuditEntry { id: string; kind: string; createdAt: string }
interface InvoiceDetail {
  id: string; invoiceNumber: string; uuid: string; kind: string; documentType: string;
  status: string; issueDate: string; issueTime: string;
  buyerName: string | null; buyerVat: string | null;
  taxableAmount: number; vatAmount: number; grandTotal: number;
  hash: string | null; previousHash: string | null; signature: string | null;
  qr: string | null; xml: string | null; resultCode: string | null; createdAt: string;
  lines: Line[]; records: Record_[]; audit: AuditEntry[];
  company: { name: string; nameAr: string | null; vatNumber: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  cleared: "var(--ac)", reported: "var(--ac)", signed: "var(--info)",
  submitted: "var(--warn)", draft: "var(--t3)", rejected: "var(--dang)",
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang } = useLang();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [showXml, setShowXml] = useState(false);

  const { state, retry } = useAsyncData<InvoiceDetail>(
    async (signal) => {
      const res = await fetch(`/api/audit/${id}`, { signal });
      if (res.status === 404) throw new Error("Invoice not found.");
      if (!res.ok) throw new Error(`Failed to load invoice (${res.status})`);
      return (await res.json()).invoice as InvoiceDetail;
    },
    [id],
  );

  async function submitToZatca() {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch(`/api/invoices/${id}/clear`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setSubmitMsg(res.ok ? "Submitted to ZATCA." : data.error || `Submission failed (${res.status}).`);
      retry();
    } catch {
      setSubmitMsg("Connection error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0, marginBottom: 14 }}>
        <Icon name="chevron" size={14} sw={2} /> Back
      </button>

      <AsyncBoundary state={state} onRetry={retry}>
        {(inv) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Header */}
            <Card>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: "var(--fmono)" }}>{inv.invoiceNumber}</h1>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: STATUS_TONE[inv.status] ?? "var(--t2)", padding: "3px 10px", borderRadius: 8, background: "var(--s2)", border: "1px solid var(--bd)" }}>
                      {inv.status}{inv.resultCode ? ` · ${inv.resultCode}` : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--t3)" }}>
                    {inv.documentType !== "invoice" ? `${inv.documentType} note · ` : ""}{inv.kind} · issued {inv.issueDate} {inv.issueTime}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)", fontFamily: "var(--fmono)", marginTop: 4 }}>UUID {inv.uuid}</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={`/api/invoices/${inv.id}/pdf`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--t2)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
                    <Icon name="doc" size={14} sw={2} /> PDF
                  </a>
                  {(inv.status === "signed" || inv.status === "rejected") && (
                    <button onClick={submitToZatca} disabled={submitting}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, border: "none", background: "linear-gradient(150deg,var(--acb),var(--ac))", color: "var(--on-ac)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                      <Icon name="bolt" size={14} sw={2} /> {submitting ? "Submitting…" : "Submit to ZATCA"}
                    </button>
                  )}
                </div>
              </div>
              {submitMsg && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--t2)" }}>{submitMsg}</div>}
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
              {/* Lines + totals */}
              <Card>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Line items</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: "var(--t3)", textAlign: "left", borderBottom: "1px solid var(--bd)" }}>
                      <th style={{ padding: "8px 6px", fontWeight: 500 }}>Description</th>
                      <th style={{ padding: "8px 6px", fontWeight: 500, textAlign: "right" }}>Qty</th>
                      <th style={{ padding: "8px 6px", fontWeight: 500, textAlign: "right" }}>Unit</th>
                      <th style={{ padding: "8px 6px", fontWeight: 500, textAlign: "right" }}>Net</th>
                      <th style={{ padding: "8px 6px", fontWeight: 500, textAlign: "right" }}>VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((l) => (
                      <tr key={l.id} style={{ borderBottom: "1px solid var(--bd)" }}>
                        <td style={{ padding: "9px 6px" }}>{l.description}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--fmono)" }}>{l.quantity}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--fmono)" }}>{l.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--fmono)" }}>{l.netAmount.toFixed(2)}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--fmono)" }}>{l.vatAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, alignItems: "flex-end", fontSize: 13 }}>
                  <div style={{ color: "var(--t2)" }}>Taxable {sar(inv.taxableAmount, lang)}</div>
                  <div style={{ color: "var(--t2)" }}>VAT (15%) {sar(inv.vatAmount, lang)}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Total {sar(inv.grandTotal, lang)}</div>
                </div>
              </Card>

              {/* Parties + crypto */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Parties</div>
                  <Row k="Seller" v={inv.company ? `${inv.company.name} · VAT ${inv.company.vatNumber}` : "—"} />
                  <Row k="Buyer" v={inv.buyerName ? `${inv.buyerName}${inv.buyerVat ? ` · VAT ${inv.buyerVat}` : ""}` : "— (simplified)"} />
                </Card>
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Cryptographic trail</div>
                  <Row k="Hash" v={inv.hash ?? "—"} mono />
                  <Row k="Previous hash" v={inv.previousHash ?? "— (genesis)"} mono />
                  <Row k="QR payload" v={inv.qr ? `${inv.qr.slice(0, 44)}…` : "—"} mono />
                  <Row k="Signature" v={inv.signature ? `${inv.signature.slice(0, 44)}…` : "—"} mono />
                </Card>
              </div>
            </div>

            {/* ZATCA responses */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>ZATCA submissions</div>
              {inv.records.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--t3)" }}>Not submitted yet.</div>
              ) : (
                inv.records.map((r) => (
                  <div key={r.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid var(--bd)", fontSize: 12.5 }}>
                    <span style={{ fontFamily: "var(--fmono)", color: "var(--t3)" }}>{new Date(r.createdAt).toLocaleString()}</span>
                    <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.action}</span>
                    <span style={{ fontWeight: 700, color: r.status === "accepted" ? "var(--ac)" : r.status === "rejected" ? "var(--dang)" : "var(--warn)" }}>{r.status}</span>
                    {r.responseCode && <span style={{ fontFamily: "var(--fmono)" }}>{r.responseCode}</span>}
                    {r.message && <span style={{ color: "var(--t3)" }}>{r.message}</span>}
                  </div>
                ))
              )}
            </Card>

            {/* XML */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showXml ? 12 : 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Signed XML</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {inv.xml && (
                    <button onClick={() => navigator.clipboard?.writeText(inv.xml ?? "")} style={xmlBtn}>Copy</button>
                  )}
                  <button onClick={() => setShowXml((s) => !s)} style={xmlBtn}>{showXml ? "Hide" : "Show"}</button>
                </div>
              </div>
              {showXml && (
                <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.55, fontFamily: "var(--fmono)", color: "var(--t2)", background: "var(--s2)", border: "1px solid var(--bd)", borderRadius: 10, padding: 14, overflowX: "auto", maxHeight: 420 }}>
                  {inv.xml ?? "No XML stored."}
                </pre>
              )}
            </Card>

            <div style={{ fontSize: 12, color: "var(--t3)" }}>
              Audit entries: {inv.audit.length} · <Link href="/audit" style={{ color: "var(--ac)" }}>open Audit Vault</Link>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

const xmlBtn: React.CSSProperties = { background: "transparent", border: "1px solid var(--bd)", color: "var(--t2)", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", padding: "5px 12px", borderRadius: 8 };

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 12.5 }}>
      <span style={{ color: "var(--t3)", flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: mono ? "var(--fmono)" : "inherit", color: "var(--t2)", textAlign: "end", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}
