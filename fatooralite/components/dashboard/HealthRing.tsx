"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { healthBars, healthValues } from "@/data/kpis";

export const RING_RADIUS = 130;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈816.81

/** SVG dash offset for a 0–100 score (0 at 100%, full circumference at 0%). */
export function ringOffset(score: number): number {
  return RING_CIRCUMFERENCE * (1 - score / 100);
}

export function HealthRing({ score }: { score: number }) {
  const { t, lang } = useLang();
  const [val, setVal] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    const dur = 1300;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      setVal(score * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <Card
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        padding: 26,
        background:
          "radial-gradient(120% 120% at 100% 0%, var(--acs), transparent 55%), var(--s1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t2)" }}>
            {t.complianceHealth}
          </div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
            {t.healthSub}
          </div>
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            padding: "5px 11px",
            borderRadius: 20,
            background: "var(--acs)",
            color: "var(--ac)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ac)" }} />
          {t.compliant}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 188, height: 188, flex: "none" }}>
          <svg width="188" height="188" viewBox="0 0 300 300" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="150" cy="150" r={RING_RADIUS} fill="none" stroke="var(--s3)" strokeWidth="20" />
            <circle
              cx="150"
              cy="150"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#ringg)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE.toFixed(1)}
              strokeDashoffset={ringOffset(val).toFixed(1)}
            />
            <defs>
              <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#34d399" />
                <stop offset="1" stopColor="#059669" />
              </linearGradient>
            </defs>
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                letterSpacing: "-.03em",
                lineHeight: 1,
                fontFamily: "var(--fdisp)",
              }}
            >
              {val.toFixed(1)}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4, fontWeight: 600 }}>
              / 100
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 13 }}>
          {healthBars.map((hb, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, color: "var(--t2)", fontWeight: 500 }}>
                  {hb.label[lang]}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: "var(--fmono)",
                    color: "var(--tx)",
                  }}
                >
                  {healthValues[i]}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 6, background: "var(--s3)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${hb.pct}%`,
                    borderRadius: 6,
                    background: "linear-gradient(90deg,var(--ac),var(--acb))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
