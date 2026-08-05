"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { useZatcaConnection } from "@/lib/useCompany";

/**
 * Gateway status at the sidebar footer.
 *
 * This used to render "Production Connected — api.zatca.gov.sa" unconditionally,
 * on every page, for every tenant. A business that had never completed ZATCA
 * onboarding was told, persistently and prominently, that it was connected to
 * the tax authority. It now reports what is actually true, and stays neutral
 * while the state is still unknown rather than guessing optimistically.
 */
export function TrustPill() {
  const { t, lang } = useLang();
  const connected = useZatcaConnection();
  if (connected === null) return null;

  const label = connected
    ? t.trustProd
    : lang === "ar"
      ? "التوقيع المحلي فقط"
      : "Local signing only";
  const sub = connected
    ? "api.zatca.gov.sa"
    : lang === "ar"
      ? "لم يتم الربط مع الهيئة"
      : "Not onboarded to ZATCA";
  const tone = connected ? "var(--ac)" : "var(--warn)";
  const bg = connected ? "var(--acs)" : "var(--warns)";

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid var(--bd)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 11px",
          borderRadius: 11,
          background: bg,
          border: `1px solid ${tone}`,
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
              background: tone,
              animation: connected ? "flPing 2s ease-out infinite" : "none",
            }}
          />
          <span
            style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: tone }}
          />
        </span>
        <div style={{ flex: 1, lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: tone }}>
            {label}
          </div>
          <div
            style={{ fontSize: 10.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}
          >
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}
