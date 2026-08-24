"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { useZatcaConnection } from "@/lib/useCompany";

export function TrustPill() {
  const { t, lang } = useLang();
  const connected = useZatcaConnection();
  if (connected === null) return null;

  const label = connected
    ? t.trustProd
    : lang === "ar"
      ? "التوقيع المحلي"
      : "Local Engine Mode";
  const sub = connected
    ? "api.zatca.gov.sa"
    : lang === "ar"
      ? "تشفير محلي آمن"
      : "Cryptographic Secp256k1";

  const color = connected ? "#34d399" : "#38bdf8";
  const bg = connected ? "rgba(16, 185, 129, 0.08)" : "rgba(56, 189, 248, 0.08)";
  const border = connected ? "rgba(16, 185, 129, 0.25)" : "rgba(56, 189, 248, 0.2)";

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid var(--bd)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 12,
          background: bg,
          border: `1px solid ${border}`,
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
              background: color,
              animation: "flPing 2s ease-out infinite",
            }}
          />
          <span
            style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: color }}
          />
        </span>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </div>
          <div
            style={{ fontSize: 10.5, color: "var(--t3)", fontFamily: "var(--fmono)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}
