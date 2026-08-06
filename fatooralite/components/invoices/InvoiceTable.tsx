"use client";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { sar, vatOf } from "@/lib/format";
import { statusMeta } from "@/lib/status";
import { StatusPill } from "./StatusPill";
import { TypeTag } from "./TypeTag";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { Invoice } from "@/types";

const GRID = "1.2fr 1.6fr 1fr .85fr .9fr .95fr 1fr .85fr 44px";

const COLS = {
  en: ["Invoice #", "Customer", "Amount", "VAT", "Type", "UUID", "Status", "Result", ""],
  ar: ["رقم الفاتورة", "العميل", "المبلغ", "الضريبة", "النوع", "المعرّف", "الحالة", "النتيجة", ""],
};

export function InvoiceTable({ rows }: { rows: Invoice[] }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const mobile = useMediaQuery(639);

  if (mobile) {
    return (
      <div role="list" aria-label="Invoices" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => {
          const m = statusMeta(r.status, t, lang);
          return (
            <div
              key={r.num}
              role="listitem"
              onClick={() => r.id && router.push(`/invoices/${r.id}`)}
              style={{
                background: "var(--s1)",
                border: "1px solid var(--bd)",
                borderRadius: 14,
                padding: "14px 16px",
                cursor: r.id ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--fmono)" }}>{r.num}</span>
                <StatusPill status={r.status} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--s3)",
                    color: "var(--t2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {r.customer.en[0]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.customer[lang]}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--fmono)" }}>{sar(r.amount, lang)}</span>
                  <span style={{ fontSize: 12, color: "var(--t3)", marginInlineStart: 8, fontFamily: "var(--fmono)" }}>
                    VAT {sar(vatOf(r.amount), lang)}
                  </span>
                </div>
                <TypeTag type={r.type} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--fmono)" }}>{r.uuid}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.color, fontFamily: "var(--fmono)" }}>{r.result}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <div
        role="table"
        aria-label="Invoices"
        style={{
          borderRadius: 18,
          border: "1px solid var(--bd)",
          background: "var(--s1)",
          boxShadow: "var(--sh)",
          overflow: "hidden",
          minWidth: 900,
        }}
      >
        {/* header */}
        <div
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            padding: "13px 20px",
            borderBottom: "1px solid var(--bd)",
            background: "var(--s2)",
          }}
        >
          {COLS[lang].map((c, i) => (
            <div
              key={i}
              role="columnheader"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: "var(--t3)",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </div>
          ))}
        </div>

        {/* rows */}
        {rows.map((r) => {
          const m = statusMeta(r.status, t, lang);
          return (
            <div
              key={r.num}
              role="row"
              onClick={() => r.id && router.push(`/invoices/${r.id}`)}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 12,
                padding: "14px 20px",
                borderBottom: "1px solid var(--bd)",
                alignItems: "center",
                cursor: r.id ? "pointer" : "default",
              }}
            >
              <div
                role="cell"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--fmono)",
                  whiteSpace: "nowrap",
                }}
              >
                {r.num}
              </div>
              <div role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: "var(--s3)",
                    color: "var(--t2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    flex: "none",
                  }}
                >
                  {r.customer.en[0]}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.customer[lang]}
                </span>
              </div>
              <div role="cell" style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--fmono)", whiteSpace: "nowrap" }}>
                {sar(r.amount, lang)}
              </div>
              <div role="cell" style={{ fontSize: 12.5, color: "var(--t2)", fontFamily: "var(--fmono)", whiteSpace: "nowrap" }}>
                {sar(vatOf(r.amount), lang)}
              </div>
              <div role="cell">
                <TypeTag type={r.type} />
              </div>
              <div role="cell" style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--fmono)", whiteSpace: "nowrap" }}>
                {r.uuid}
              </div>
              <div role="cell">
                <StatusPill status={r.status} />
              </div>
              <div
                role="cell"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: m.color,
                  fontFamily: "var(--fmono)",
                  whiteSpace: "nowrap",
                }}
              >
                {r.result}
              </div>
              <button
                aria-label="Row actions"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "1px solid transparent",
                  background: "transparent",
                  color: "var(--t3)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
