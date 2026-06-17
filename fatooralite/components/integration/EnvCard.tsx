"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { EnvInfo } from "@/types";

export function EnvCard({ env }: { env: EnvInfo }) {
  const { lang } = useLang();
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
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "var(--acs)",
              color: "var(--ac)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cloud" size={20} sw={1.7} />
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{env.name[lang]}</div>
            <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--fmono)" }}>
              {env.host}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 9px",
            borderRadius: 7,
            background: "var(--s3)",
            color: "var(--t2)",
            fontFamily: "var(--fmono)",
          }}
        >
          {env.tag}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, padding: "11px 13px", borderRadius: 11, background: "var(--s2)" }}>
          <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>Status</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ac)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--ac)",
                boxShadow: "0 0 0 3px var(--acs)",
              }}
            />
            {env.status[lang]}
          </div>
        </div>
        <div style={{ flex: 1, padding: "11px 13px", borderRadius: 11, background: "var(--s2)" }}>
          <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>Latency</div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--fmono)" }}>
            {env.latency}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 11, fontSize: 11.5, color: "var(--t3)", fontFamily: "var(--fmono)" }}>
        {env.sub}
      </div>
    </Card>
  );
}
