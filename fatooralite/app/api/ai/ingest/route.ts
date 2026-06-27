import { NextResponse } from "next/server";
import { upsertChunks, clearSource, globalChunkCount } from "@/lib/ai/vector-store";
import { ZATCA_CORPUS, ZATCA_CORPUS_SOURCE } from "@/lib/ai/zatca-corpus";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/ai/ingest — (re)build the global ZATCA knowledge base used by the
 * assistant's retrieval. Idempotent: clears the existing corpus then re-embeds.
 */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "settings:manage");
  if (deny) return deny;

  try {
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

/** GET /api/ai/ingest — report how many global chunks are indexed. */
export async function GET(req: Request) {
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;
  return NextResponse.json({ totalGlobal: await globalChunkCount() });
}
