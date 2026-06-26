"use client";
import { useEffect, useState } from "react";
import { usePageMeta } from "@/lib/usePageMeta";
import { useCompany } from "@/lib/useCompany";

export default function Page() {
  const { title } = usePageMeta();
  const { company } = useCompany();
  const companyId = company?.id;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetch(`/api/reports?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>{title as string}</h1>
      <div style={{ padding: 24, borderRadius: 16, background: "var(--s1)", border: "1px solid var(--bd)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>VAT Return Summary ({report?.period})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div style={{ padding: 16, borderRadius: 12, background: "var(--s2)", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>Total Taxable Amount</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>SAR {report?.totalTaxable?.toFixed(2)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: "var(--s2)", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>Total VAT Collected</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ac)" }}>SAR {report?.totalVat?.toFixed(2)}</div>
          </div>
          <div style={{ padding: 16, borderRadius: 12, background: "var(--s2)", border: "1px solid var(--bd)" }}>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>Invoices Processed</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{report?.totalInvoices}</div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <a
            href={companyId ? `/api/reports?companyId=${companyId}&format=csv` : undefined}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              borderRadius: 8,
              background: "var(--ac)",
              color: "#000",
              fontWeight: 600,
              border: "none",
              cursor: companyId ? "pointer" : "not-allowed",
              opacity: companyId ? 1 : 0.5,
              textDecoration: "none",
            }}
          >
            Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}
