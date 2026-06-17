"use client";
import { useLang } from "@/lib/i18n/LangProvider";

/** "Production Connected" pill with a pinging dot at the sidebar footer. */
export function TrustPill() {
  const { t } = useLang();
  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid var(--bd)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 11px",
          borderRadius: 11,
          background: "var(--acs)",
          border: "1px solid rgba(16,185,129,.22)",
        }}
      >
        <span
          style={{ position: "relative", display: "flex", width: 8, height: 8, flex: "none" }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--ac)",
              animation: "flPing 2s ease-out infinite",
            }}
          />
          <span
            style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "var(--ac)" }}
          />
        </span>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ac)" }}>
            {t.trustProd}
          </div>
          <div
            style={{ fontSize: 10.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}
          >
            api.zatca.gov.sa
          </div>
        </div>
      </div>
    </div>
  );
}
