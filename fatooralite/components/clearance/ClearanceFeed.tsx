"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { clearanceFeed } from "@/data/feed";
import { filterChips } from "@/data/clearance";
import { statusMeta } from "@/lib/status";

export function ClearanceFeed() {
  const { t, lang } = useLang();
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 9 }}>
          {t.liveActivity}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".1em",
              color: "var(--ac)",
              background: "var(--acs)",
              padding: "3px 7px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ position: "relative", display: "flex", width: 6, height: 6 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--ac)",
                  animation: "flPing 2s ease-out infinite",
                }}
              />
              <span style={{ position: "relative", width: 6, height: 6, borderRadius: "50%", background: "var(--ac)" }} />
            </span>
            {t.live}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filterChips.map((ch) => (
            <button
              key={ch.en}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: "5px 11px",
                borderRadius: 9,
                border: "1px solid var(--bd)",
                background: "var(--s2)",
                color: "var(--t2)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {ch[lang]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            insetInlineStart: 6,
            top: 6,
            bottom: 6,
            width: 1.5,
            background: "var(--bd)",
          }}
        />
        {clearanceFeed.map((f, i) => {
          const m = statusMeta(f.status, t, lang);
          return (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                gap: 14,
                padding: "11px 6px",
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: "var(--s1)",
                  border: `2px solid ${m.color}`,
                  flex: "none",
                  marginTop: 2,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{m.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}>
                    {f.inv}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--t2)" }}>· {f.customer[lang]}</span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--t3)",
                    marginTop: 2,
                    fontFamily: "var(--fmono)",
                  }}
                >
                  {f.msg ? f.msg[lang] : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--t3)",
                  fontFamily: "var(--fmono)",
                  flex: "none",
                }}
              >
                {f.time}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
