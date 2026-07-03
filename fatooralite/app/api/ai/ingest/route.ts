import { NextResponse } from "next/server";
import { upsertChunks, clearSource, globalChunkCount } from "@/lib/ai/vector-store";
import { ingestCompanyData, companyChunkCount } from "@/lib/ai/tenant-ingest";
import { ZATCA_CORPUS, ZATCA_CORPUS_SOURCE } from "@/lib/ai/zatca-corpus";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/ai/ingest — (re)build retrieval indexes. Idempotent.
 *
 * Body { scope: "global" } (default) re-embeds the shared ZATCA corpus.
 * Body { scope: "company" } re-embeds the caller's own tenant data
 * (invoices/customers/products summaries) for company-scoped RAG.
 */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "settings:manage");
  if (deny) return deny;

  let scope = "global";
  try {
    const body = await req.json();
    if (body?.scope === "company") scope = "company";
  } catch {
    /* empty body -> global */
  }

  try {
    if (scope === "company") {
      const user = await getUserFromRequest(req);
      if (!user?.companyId) {
        return NextResponse.json({ error: "No active company" }, { status: 400 });
      }
      const count = await ingestCompanyData(user.companyId);
      return NextResponse.json({
        ingested: count,
        totalCompany: await companyChunkCount(user.companyId),
      });
    }

    await clearSource(ZATCA_CORPUS_SOURCE, null);
    const count = await upsertChunks(
      ZATCA_CORPUS.map((text) => ({ scope: "global" as const, source: ZATCA_CORPUS_SOURCE, text })),
    );
    return NextResponse.json({ ingested: count, totalGlobal: await globalChunkCount() });
  } catch (err) {
    console.error("Ingest error:", err);
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
