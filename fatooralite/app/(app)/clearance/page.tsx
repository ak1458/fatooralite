"use client";
import { useCompany } from "@/lib/useCompany";
import { useAsyncData } from "@/lib/async/useAsyncData";
import { AsyncBoundary } from "@/components/common/AsyncBoundary";
import { NoCompanyState } from "@/components/common/NoCompanyState";
import type { ClearanceStats } from "@/lib/services/clearance-stats";

interface FeedRow {
  invoiceNumber: string;
  buyer: string;
  status: string;
  kind: string;
  resultCode: string | null;
  amount: number;
  time: string;
}
interface ClearanceData {
  stats: ClearanceStats;
  feed: FeedRow[];
}

const STATUS_TONE: Record<string, { fg: string; bg: string }> = {
  cleared: { fg: "var(--ac)", bg: "var(--acs)" },
  reported: { fg: "var(--ac)", bg: "var(--acs)" },
  rejected: { fg: "var(--dang)", bg: "rgba(239,68,68,.12)" },
  signed: { fg: "var(--warn,#f59e0b)", bg: "rgba(245,158,11,.12)" },
  draft: { fg: "var(--t3)", bg: "var(--s2)" },
};

export default function ClearancePage() {
  const { company, isLoading: companyLoading } = useCompany();
  const { state, retry } = useAsyncData<ClearanceData>(
    async (signal) => {
      const res = await fetch(`/api/clearance?companyId=${company!.id}`, { signal });
      if (!res.ok) throw new Error(`Failed to load compliance data (${res.status})`);
      return (await res.json()) as ClearanceData;
    },
    [company?.id],
    { enabled: !!company?.id },
  );

  if (!company?.id && !companyLoading) return <NoCompanyState />;

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Compliance Center</h1>
      <p style={{ color: "var(--t3)", fontSize: 13.5, margin: "0 0 22px" }}>
        Live clearance &amp; reporting status for your invoices.
      </p>

      <AsyncBoundary state={state} onRetry={retry}>
        {({ stats, feed }) => (
          <>
            {(stats.overdue > 0 || stats.nearDeadline > 0) && (
              <div
                style={{
                  display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 12,
                  background: stats.overdue > 0 ? "rgba(239,68,68,.1)" : "rgba(245,158,11,.1)",
                  border: `1px solid ${stats.overdue > 0 ? "rgba(239,68,68,.3)" : "rgba(245,158,11,.3)"}`,
                  marginBottom: 18, fontSize: 13.5,
                }}
              >
                <span style={{ fontWeight: 700, color: stats.overdue > 0 ? "var(--dang)" : "var(--warn,#f59e0b)" }}>
                  {stats.overdue > 0 ? "Action required" : "Reporting deadline"}
                </span>
                <span style={{ color: "var(--t2)" }}>
                  {stats.overdue > 0 && `${stats.overdue} simplified invoice(s) past the 24h reporting window. `}
                  {stats.nearDeadline > 0 && `${stats.nearDeadline} approaching the 24h deadline.`}
                </span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 18 }}>
              <Stat label="Success rate" value={`${stats.successRate}%`} tone="ac" big />
              <Stat label="Cleared" value={stats.cleared} />
              <Stat label="Reported" value={stats.reported} />
              <Stat label="Pending" value={stats.pending} tone={stats.pending ? "warn" : undefined} />
              <Stat label="Rejected" value={stats.rejected} tone={stats.rejected ? "dang" : undefined} />
              <Stat label="VAT collected" value={`SAR ${stats.vatCollected.toFixed(2)}`} />
            </div>

            <div style={{ background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bd)", fontWeight: 600, fontSize: 14 }}>
                Recent activity
              </div>
              {feed.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--t3)", fontSize: 13.5 }}>
                  No invoices yet. Issue an invoice to see clearance activity.
                </div>
              ) : (
                feed.map((r) => {
                  const tone = STATUS_TONE[r.status] ?? STATUS_TONE.draft;
                  return (
                    <div key={r.invoiceNumber} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid var(--bd)" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.invoiceNumber}</span>
                        <span style={{ color: "var(--t3)", fontSize: 12 }}>{r.buyer} · {r.kind}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontFamily: "var(--fmono)", fontSize: 13, color: "var(--t2)" }}>SAR {r.amount.toFixed(2)}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: tone.bg, color: tone.fg }}>
                          {r.resultCode || r.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string | number; tone?: "ac" | "warn" | "dang"; big?: boolean }) {
  const color = tone === "ac" ? "var(--ac)" : tone === "warn" ? "var(--warn,#f59e0b)" : tone === "dang" ? "var(--dang)" : "var(--tx)";
  return (
    <div style={{ padding: 18, borderRadius: 14, background: "var(--s1)", border: "1px solid var(--bd)" }}>
      <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
