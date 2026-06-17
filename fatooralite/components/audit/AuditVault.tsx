"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/invoices/StatusPill";
import type { InvoiceStatus } from "@/types";

interface Row {
  id: string;
  invoiceNumber: string;
  uuid: string;
  buyerName: string | null;
  status: string;
  grandTotal: number;
  issueDate: string;
  kind: string;
}
interface Detail extends Row {
  hash: string | null;
  signature: string | null;
  qr: string | null;
  signedXml: string | null;
  records: { id: string; action: string; status: string; responseCode: string | null; message: string | null; createdAt: string }[];
  audit: { id: string; kind: string; createdAt: string }[];
}

const L = {
  searchPh: { en: "Search invoice #, UUID, customer…", ar: "ابحث برقم الفاتورة، المعرّف، العميل…" },
  empty: { en: "No invoices found. Create one to populate the vault.", ar: "لا توجد فواتير. أنشئ فاتورة لملء الخزنة." },
  pick: { en: "Select an invoice to view its audit trail.", ar: "اختر فاتورة لعرض سجل التدقيق." },
  artifacts: { en: "Stored artifacts", ar: "الملفات المحفوظة" },
  gateway: { en: "ZATCA responses", ar: "ردود الهيئة" },
  signedXml: { en: "Signed XML", ar: "XML الموقّع" },
  qr: { en: "QR payload", ar: "محتوى QR" },
  hash: { en: "Invoice hash", ar: "بصمة الفاتورة" },
  none: { en: "—", ar: "—" },
};

export function AuditVault() {
  const { lang } = useLang();
  const [companyId, setCompanyId] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const t = (k: keyof typeof L) => L[k][lang];

  const load = useCallback(
    async (cid: string, query: string) => {
      const res = await fetch(`/api/audit?companyId=${cid}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setRows(data.invoices ?? []);
    },
    [],
  );

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const cid = d.companies?.[0]?.id ?? "";
        setCompanyId(cid);
        if (cid) load(cid, "");
      });
  }, [load]);

  useEffect(() => {
    if (!companyId) return;
    const t = setTimeout(() => load(companyId, q), 250);
    return () => clearTimeout(t);
  }, [q, companyId, load]);

  async function open(id: string) {
    const res = await fetch(`/api/audit/${id}`);
    const data = await res.json();
    setSelected(data.invoice);
  }

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid var(--bd)",
          background: "var(--s1)",
          marginBottom: 16,
          maxWidth: 520,
        }}
      >
        <Icon name="search" size={16} sw={2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPh")}
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--tx)",
            fontSize: 13.5,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
        {/* results */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {rows.length === 0 ? (
            <div style={{ padding: 28, color: "var(--t3)", fontSize: 13.5 }}>{t("empty")}</div>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.2fr 0.9fr 0.9fr",
                  gap: 10,
                  alignItems: "center",
                  width: "100%",
                  textAlign: "start",
                  padding: "13px 18px",
                  border: "none",
                  borderBottom: "1px solid var(--bd)",
                  background: selected?.id === r.id ? "var(--s2)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--tx)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--fmono)" }}>{r.invoiceNumber}</span>
                <span style={{ fontSize: 13, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.buyerName ?? t("none")}
                </span>
                <span style={{ fontSize: 12.5, fontFamily: "var(--fmono)" }}>{sar(r.grandTotal, lang)}</span>
                <span style={{ justifySelf: "end" }}>
                  <StatusPill status={r.status as InvoiceStatus} />
                </span>
              </button>
            ))
          )}
        </Card>

        {/* detail */}
        <Card>
          {!selected ? (
            <div style={{ color: "var(--t3)", fontSize: 13.5, padding: "8px 0" }}>{t("pick")}</div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--fdisp)" }}>{selected.invoiceNumber}</div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}>{selected.uuid}</div>
                </div>
                <StatusPill status={selected.status as InvoiceStatus} />
              </div>

              <Field k={t("hash")} v={selected.hash ?? t("none")} mono />
              <Field k={t("qr")} v={selected.qr ? selected.qr.slice(0, 44) + "…" : t("none")} mono />

              <Section title={t("gateway")}>
                {selected.records.length === 0 ? (
                  <Muted>{t("none")}</Muted>
                ) : (
                  selected.records.map((rec) => (
                    <div key={rec.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--bd)" }}>
                      <span style={{ fontWeight: 600, color: rec.status === "rejected" ? "var(--dang)" : "var(--ac)" }}>
                        {rec.action} · {rec.status}
                      </span>
                      {rec.responseCode ? <span style={{ color: "var(--t3)", fontFamily: "var(--fmono)" }}> · {rec.responseCode}</span> : null}
                      {rec.message ? <div style={{ color: "var(--t2)", marginTop: 2 }}>{rec.message}</div> : null}
                    </div>
                  ))
                )}
              </Section>

              <Section title={t("artifacts")}>
                {selected.audit.length === 0 ? (
                  <Muted>{t("none")}</Muted>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selected.audit.map((a) => (
                      <span
                        key={a.id}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "5px 10px",
                          borderRadius: 8,
                          background: "var(--s2)",
                          border: "1px solid var(--bd)",
                          color: "var(--t2)",
                          fontFamily: "var(--fmono)",
                        }}
                      >
                        {a.kind}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              {selected.signedXml && (
                <Section title={t("signedXml")}>
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      borderRadius: 10,
                      background: "var(--s2)",
                      border: "1px solid var(--bd)",
                      fontSize: 10.5,
                      fontFamily: "var(--fmono)",
                      color: "var(--t2)",
                      overflowX: "auto",
                      maxHeight: 240,
                    }}
                  >
                    {selected.signedXml}
                  </pre>
                </Section>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: "1px solid var(--bd)" }}>
      <span style={{ fontSize: 12, color: "var(--t3)", flex: "none" }}>{k}</span>
      <span style={{ fontSize: 12, color: "var(--tx)", fontFamily: mono ? "var(--fmono)" : "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {v}
      </span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: "var(--t3)" }}>{children}</div>;
}
