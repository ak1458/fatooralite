"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useLang } from "@/lib/i18n/LangProvider";
import { Icon } from "@/components/ui/Icon";
import { HealthRing } from "@/components/dashboard/HealthRing";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrustBadges } from "@/components/dashboard/TrustBadges";
import { ApiSparkline } from "@/components/dashboard/ApiSparkline";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { LiveFeed } from "@/components/dashboard/LiveFeed";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { useCompany, useAuth } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import type { Kpi, FeedEvent, VolumeBar, HealthBar, Service } from "@/types";
import type { TrustBadge } from "@/components/dashboard/TrustBadges";

interface DashboardData {
  kpis: { counters: Record<string, number>; healthBars: HealthBar[]; kpis: Kpi[] };
  feed: FeedEvent[];
  volume: VolumeBar[];
  integration: { services: Service[]; badges: TrustBadge[]; hasCert: boolean; isLocal: boolean };
}

/** Time-of-day greeting in both languages. */
function greetingText(name: string, lang: "en" | "ar"): string {
  const h = new Date().getHours();
  if (lang === "ar") {
    const period = h < 12 ? "صباح الخير" : h < 18 ? "مساء الخير" : "مساء الخير";
    return `${period}، ${name}`;
  }
  const period = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${period}, ${name}`;
}

/** Real formatted date string. */
function todayString(lang: "en" | "ar"): string {
  const now = new Date();
  if (lang === "ar") {
    return now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  return now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { company } = useCompany();
  const { user } = useAuth();
  const { state, retry } = useAsyncData<DashboardData>(
    async (signal) => {
      const res = await fetch(`/api/dashboard?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
      return (await res.json()) as DashboardData;
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  const data = state.status === "success" ? state.data : null;
  const dashboardCounters = data?.kpis?.counters ?? { score: 0, vat: 0, inv: 0, succ: 0 };
  const dashboardFeed = data?.feed ?? [];
  const dashboardVolume = data?.volume ?? [];

  const greeting = useMemo(() => greetingText(user?.name ?? "there", lang), [user?.name, lang]);
  const dateStr = useMemo(() => todayString(lang), [lang]);

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
            <span style={{ fontSize: 12, color: "var(--t3)" }}>{dateStr}</span>
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
            {greeting}
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

      <TrustBadges badges={data?.integration?.badges} />

      {/* hero: health ring + 2x2 KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <HealthRing
          score={dashboardCounters.score}
          healthBars={data?.kpis?.healthBars}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <AsyncBoundary
            state={state}
            isEmpty={(d) => !d.kpis?.kpis?.length}
            empty={<div style={{ gridColumn: "1 / -1", color: "var(--t3)", fontSize: 13 }}>No KPIs yet.</div>}
            onRetry={retry}
          >
            {(d) => (
              <>
                {d.kpis.kpis.map((k: Kpi) => (
                  <KpiCard key={k.label.en} kpi={k} />
                ))}
              </>
            )}
          </AsyncBoundary>
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
        <IntegrationStatus services={data?.integration?.services} />
      </div>

      {/* row 3: live feed + volume */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <LiveFeed initialEvents={dashboardFeed} />
        <VolumeChart initialData={dashboardVolume} />
      </div>
    </div>
  );
}

