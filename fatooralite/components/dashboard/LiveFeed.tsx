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
    <Card
      folderTab={
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚡</span>
          <span>{t.liveActivity}</span>
        </div>
      }
      style={{ display: "flex", flexDirection: "column", minHeight: 250 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          marginTop: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".08em",
              color: "var(--ac)",
              background: "var(--acs)",
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid var(--acbd)",
            }}
          >
            LIVE STREAM
          </span>
          <span style={{ fontSize: 12, color: "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>Y Filter</span>
          </span>
        </div>
        <Link
          href="/clearance"
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--ac)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>{t.viewAll}</span>
          <span>›</span>
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
        <div role="list" aria-live="polite" aria-atomic="true" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map((f, i) => {
            const m = statusMeta(f.status, t, lang);
            return (
              <div
                key={i}
                role="listitem"
                className="glass-card-hover"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "var(--s2)",
                  border: "1px solid var(--bd)",
                }}
              >
                <span
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "var(--s1)",
                    border: `2px solid ${m.color}`,
                    flex: "none",
                    boxShadow: `0 0 8px ${m.color}66`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: m.color,
                        background: `${m.color}1a`,
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      {feedLabel(f.status, t)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--tx)", fontWeight: 600, fontFamily: "var(--fmono)" }}>
                      {f.inv}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.customer[lang]}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--s3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--t2)",
                      fontSize: 10,
                    }}
                  >
                    ▶
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
