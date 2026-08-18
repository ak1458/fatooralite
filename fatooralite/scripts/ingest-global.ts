/**
 * Rebuild the shared ZATCA knowledge base (global RAG scope).
 *
 *   npx tsx scripts/ingest-global.ts
 *
 * The corpus is a code constant (lib/ai/zatca-corpus.ts) — rebuilding it is
 * an operational task (a deploy that changed the corpus text), not something
 * any tenant should trigger. Phase 2 / W6 closed the HTTP path
 * (POST /api/ai/ingest {scope:"global"}) to everyone but an operator holding
 * OPERATOR_SECRET; this script is the deploy-time replacement — no HTTP
 * credential needed, just direct database access (the same access a deploy
 * pipeline already has to run migrations).
 */
import { clearSource, upsertChunks, globalChunkCount } from "../lib/ai/vector-store";
import { ZATCA_CORPUS, ZATCA_CORPUS_SOURCE } from "../lib/ai/zatca-corpus";

async function main() {
  await clearSource(ZATCA_CORPUS_SOURCE, null);
  const count = await upsertChunks(
    ZATCA_CORPUS.map((text) => ({ scope: "global" as const, source: ZATCA_CORPUS_SOURCE, text })),
  );
  const total = await globalChunkCount();
  console.log(`Ingested ${count} chunks. Global index now holds ${total} chunks.`);
}

main().catch((err) => {
  console.error("Global ingest failed:", err);
  process.exit(1);
});
