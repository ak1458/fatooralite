"use client";
import { AnKpiGrid } from "@/components/analytics/AnKpiGrid";
import { DailyBars } from "@/components/analytics/DailyBars";
import { RevenueByCustomer } from "@/components/analytics/RevenueByCustomer";
import { VatTrend } from "@/components/analytics/VatTrend";
import { SuccessDonut } from "@/components/clearance/SuccessDonut";

export default function AnalyticsPage() {
  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <AnKpiGrid />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        <DailyBars />
        <SuccessDonut showLegend={false} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
        <RevenueByCustomer />
        <VatTrend />
      </div>
    </div>
  );
}
