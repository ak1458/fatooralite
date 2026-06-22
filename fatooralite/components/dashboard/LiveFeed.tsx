"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { statusMeta, feedLabel } from "@/lib/status";
import type { FeedEvent } from "@/types";

export function LiveFeed({ initialEvents }: { initialEvents?: FeedEvent[] }) {
  const { t, lang } = useLang();
  const events = initialEvents ?? [];

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
            }}
          >
            {t.live}
          </span>
        </div>
        <Link
          href="/clearance"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ac)",
            textDecoration: "none",
          }}
        >
          {t.viewAll}
        </Link>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {events.map((f, i) => {
            const m = statusMeta(f.status, t, lang);
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  display: "flex",
                  gap: 14,
                  padding: "8px 6px",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: m.color }}>
                      {feedLabel(f.status, t)}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}>
                      {f.inv}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 1 }}>
                    {f.customer[lang]}
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
      </div>
    </Card>
  );
}
