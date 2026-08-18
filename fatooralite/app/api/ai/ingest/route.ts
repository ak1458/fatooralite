import { NextResponse } from "next/server";
import { upsertChunks, clearSource, globalChunkCount } from "@/lib/ai/vector-store";
import { ingestCompanyData, companyChunkCount } from "@/lib/ai/tenant-ingest";
import { ZATCA_CORPUS, ZATCA_CORPUS_SOURCE } from "@/lib/ai/zatca-corpus";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { loggerFor } from "@/lib/log/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/ai/ingest — (re)build retrieval indexes. Idempotent.
 *
 * Body { scope: "company" } (default) re-embeds the caller's own tenant data
 * (invoices/customers/products summaries) for company-scoped RAG.
 *
 * Body { scope: "global" } re-embeds the SHARED ZATCA corpus used by every
 * tenant. The corpus is a code constant, so this carries no cross-tenant data
 * risk — but it is a global operation with global blast radius, and every
 * tenant owner previously held the one permission (settings:manage) that
 * reached it (F-11). There is deliberately no platform-admin role in this
 * app, so the only way to reach this path is OPERATOR_SECRET — an operator
 * credential, not a tenant session. Fail closed: an unset OPERATOR_SECRET
 * disables this path entirely, matching the CRON_SECRET convention. The
 * global corpus can still be (re)built at deploy time with
 * scripts/ingest-global.ts, which needs no HTTP credential.
 */
export async function POST(req: Request) {
  let scope = "company";
  try {
    const body = await req.json();
    if (body?.scope === "global") scope = "global";
  } catch {
    /* empty body -> company */
  }

  if (scope === "global") {
    if (
      !process.env.OPERATOR_SECRET ||
      req.headers.get("authorization") !== `Bearer ${process.env.OPERATOR_SECRET}`
    ) {
      return NextResponse.json(
        { error: "Global re-index requires an operator credential. Use scripts/ingest-global.ts at deploy time instead." },
        { status: 403 },
      );
    }

    try {
      await clearSource(ZATCA_CORPUS_SOURCE, null);
      const count = await upsertChunks(
        ZATCA_CORPUS.map((text) => ({ scope: "global" as const, source: ZATCA_CORPUS_SOURCE, text })),
      );
      await recordSecurityEvent({
        action: SECURITY_EVENTS.aiIndexRebuilt,
        outcome: "success",
        targetType: "ai",
        metadata: { scope: "global" },
        request: req,
      });
      return NextResponse.json({ ingested: count, totalGlobal: await globalChunkCount() });
    } catch (err) {
      loggerFor(req).error("ai.ingest.failed", { scope: "global", error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
    }
  }

  // Tenant-scoped re-index: unchanged, requires a real tenant session.
  const { deny } = await requirePermission(req, "settings:manage");
  if (deny) return deny;

  try {
    const user = await getUserFromRequest(req);
    if (!user?.companyId) {
      return NextResponse.json({ error: "No active company" }, { status: 400 });
    }
    const count = await ingestCompanyData(user.companyId);
    await recordSecurityEvent({
      action: SECURITY_EVENTS.aiIndexRebuilt,
      outcome: "success",
      companyId: user.companyId,
      actorId: user.userId,
      targetType: "ai",
      metadata: { scope: "company" },
      request: req,
    });
    return NextResponse.json({
      ingested: count,
      totalCompany: await companyChunkCount(user.companyId),
    });
  } catch (err) {
    loggerFor(req).error("ai.ingest.failed", { scope: "company", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}

/** GET /api/ai/ingest — report index sizes. */
export async function GET(req: Request) {
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;
  const user = await getUserFromRequest(req);
  return NextResponse.json({
    totalGlobal: await globalChunkCount(),
    totalCompany: user?.companyId ? await companyChunkCount(user.companyId) : 0,
  });
}
