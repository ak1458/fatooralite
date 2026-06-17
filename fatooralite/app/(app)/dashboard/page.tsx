"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { counters, kpis } from "@/data/kpis";
import { Icon } from "@/components/ui/Icon";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrustBadges } from "@/components/dashboard/TrustBadges";
import { ApiSparkline } from "@/components/dashboard/ApiSparkline";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { VolumeChart } from "@/components/dashboard/VolumeChart";

export default function DashboardPage() {
  const { t } = useLang();
  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      {/* header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: "var(--ac)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ position: "relative", display: "flex", width: 7, height: 7 }}>
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
                  style={{ position: "relative", width: 7, height: 7, borderRadius: "50%", background: "var(--ac)" }}
                />
              </span>
              {t.live}
            </span>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{t.date}</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-.025em",
              fontFamily: "var(--fdisp)",
            }}
          >
            {t.greeting}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 15px",
              borderRadius: 12,
              border: "1px solid var(--bd)",
              background: "var(--s1)",
              color: "var(--tx)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Icon name="compliance" size={16} sw={1.8} />
            {t.runAudit}
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 17px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(150deg,var(--acb),var(--ac))",
              color: "#04130d",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 8px 22px -10px var(--ac)",
            }}
          >
            <Icon name="plus" size={16} sw={2.4} />
            {t.create}
          </button>
        </div>
      </div>

      <TrustBadges />

      {/* hero: health ring + 2x2 KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <HealthRing score={counters.score} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {kpis.map((k) => (
            <KpiCard key={k.label.en} kpi={k} />
          ))}
        </div>
      </div>

      {/* row 2: api health + integration status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <ApiSparkline />
        <IntegrationStatus />
      </div>

      {/* row 3: live feed + volume */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <LiveFeed />
        <VolumeChart />
      </div>
    </div>
  );
}
