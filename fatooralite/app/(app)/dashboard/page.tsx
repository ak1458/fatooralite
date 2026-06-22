"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrustBadges } from "@/components/dashboard/TrustBadges";
import { ApiSparkline } from "@/components/dashboard/ApiSparkline";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { useCompany } from "@/lib/useCompany";
import type { Kpi, FeedEvent, VolumeBar } from "@/types";

export default function DashboardPage() {
  const { t } = useLang();
  const { company } = useCompany();
  const [data, setData] = useState<{ kpis: { counters: Record<string, number>, kpis: Kpi[] }; feed: FeedEvent[]; volume: VolumeBar[] } | null>(null);

  useEffect(() => {
    if (!company?.id) return;
    fetch(`/api/dashboard?companyId=${company.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [company?.id]);

  // Use real data if loaded, otherwise fallback structure (handled by components internally or pass nulls)
  const dashboardCounters = data?.kpis?.counters ?? { score: 0, vat: 0, inv: 0, succ: 0 };
  const dashboardKpis = data?.kpis?.kpis ?? [];
  const dashboardFeed = data?.feed ?? [];
  const dashboardVolume = data?.volume ?? [];

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
          <Link
            href="/invoices/new"
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
              textDecoration: "none",
            }}
          >
            <Icon name="plus" size={16} sw={2.4} />
            {t.create}
          </Link>
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
        <HealthRing score={dashboardCounters.score} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {dashboardKpis.length > 0 ? dashboardKpis.map((k: Kpi) => (
            <KpiCard key={k.label.en} kpi={k} />
          )) : <div style={{ color: "var(--t3)" }}>Loading KPIs...</div>}
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
        <LiveFeed initialEvents={dashboardFeed} />
        <VolumeChart initialData={dashboardVolume} />
      </div>
    </div>
  );
}
