import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { log } from "@/lib/log/logger";

/**
 * Per-call AI usage accounting (Phase 2 / W6 — closes F-11's "no per-customer
 * AI usage limits" observation and A-128/A-129, latency measurement).
 *
 * Every field here is written from the provider's own response or from
 * request-scoped server state (companyId, userId, timing) — nothing is ever
 * read from a client-supplied number. There is no quota *enforcement* here
 * (that would need entitlements work); this is the accounting substrate a
 * quota could be built on.
 */

export interface UsageRow {
  companyId: string;
  userId?: string | null;
  route: "agent" | "chat" | "insights" | "ingest";
  provider: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  latencyMs?: number | null;
}

/** Never throws — an accounting failure must not break the AI call it describes. */
export async function recordAiUsage(row: UsageRow, db: PrismaClient = defaultDb): Promise<void> {
  try {
    await db.aiUsage.create({
      data: {
        companyId: row.companyId,
        userId: row.userId ?? null,
        route: row.route,
        provider: row.provider,
        model: row.model ?? null,
        promptTokens: row.promptTokens ?? null,
        completionTokens: row.completionTokens ?? null,
        latencyMs: row.latencyMs ?? null,
      },
    });
  } catch (err) {
    log.error("ai.usage.record_failed", { route: row.route, companyId: row.companyId, error: err instanceof Error ? err.message : String(err) });
  }
}

export interface UsageSummaryRow {
  route: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
}

/** Current-month usage for one company, grouped by route. Always company-scoped — no cross-tenant read path. */
export async function monthlyUsageSummary(companyId: string, db: PrismaClient = defaultDb): Promise<UsageSummaryRow[]> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const grouped = await db.aiUsage.groupBy({
    by: ["route"],
    where: { companyId, createdAt: { gte: monthStart } },
    _count: { _all: true },
    _sum: { promptTokens: true, completionTokens: true },
  });

  return grouped.map((g) => ({
    route: g.route,
    calls: g._count._all,
    promptTokens: g._sum.promptTokens ?? 0,
    completionTokens: g._sum.completionTokens ?? 0,
  }));
}
