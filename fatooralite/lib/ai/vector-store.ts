import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { embed, embedOne } from "./embeddings";

/**
 * pgvector-backed knowledge store for RAG. Embeddings live in a Postgres
 * `vector` column (dimension-agnostic, so the embedding provider can change);
 * similarity search runs in the database with the cosine operator `<=>`.
 *
 * The column is intentionally untyped (`vector`, not `vector(384)`), which
 * lets rows of different dimensions coexist during a provider migration.
 * Retrieval filters on `vector_dims` so a query only ever compares against
 * chunks embedded with the same model family. Re-ingest after switching
 * embedding providers (POST /api/ai/ingest).
 */

export interface ChunkInput {
  scope: "global" | "company";
  companyId?: string | null;
  source: string;
  text: string;
}

export interface Retrieved {
  text: string;
  source: string;
  score: number;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Embed and store knowledge chunks. */
export async function upsertChunks(chunks: ChunkInput[]): Promise<number> {
  if (chunks.length === 0) return 0;
  const embeddings = await embed(chunks.map((c) => c.text));
  const rows = chunks.map((c, i) =>
    Prisma.sql`(${randomUUID()}, ${c.scope}, ${c.companyId ?? null}, ${c.source}, ${c.text}, ${toVectorLiteral(embeddings[i])}::vector)`,
  );
  await prisma.$executeRaw`
    INSERT INTO "KnowledgeChunk" (id, scope, "companyId", source, text, embedding)
    VALUES ${Prisma.join(rows)}`;
  return chunks.length;
}

/** Remove chunks for a given source (so re-ingest doesn't duplicate). */
export async function clearSource(source: string, companyId: string | null = null): Promise<void> {
  await prisma.knowledgeChunk.deleteMany({
    where: { source, ...(companyId ? { companyId } : { scope: "global" }) },
  });
}

/**
 * Retrieve the most relevant chunks for a query: global ZATCA knowledge plus
 * the caller's own company data. Cosine similarity ranks in Postgres.
 */
export async function retrieve(
  query: string,
  companyId: string | null,
  k = 5,
  minScore = 0.15,
): Promise<Retrieved[]> {
  const q = await embedOne(query);
  const qvec = toVectorLiteral(q);
  const rows = await prisma.$queryRaw<{ text: string; source: string; score: number }[]>`
    SELECT text, source, 1 - (embedding <=> ${qvec}::vector) AS score
    FROM "KnowledgeChunk"
    WHERE embedding IS NOT NULL
      AND vector_dims(embedding) = ${q.length}
      AND (scope = 'global' OR (scope = 'company' AND "companyId" = ${companyId ?? ""}))
    ORDER BY embedding <=> ${qvec}::vector
    LIMIT ${k}`;
  return rows.filter((r) => r.score >= minScore);
}

export async function globalChunkCount(): Promise<number> {
  return prisma.knowledgeChunk.count({ where: { scope: "global" } });
}

/** Count a company's own ingested chunks (tenant RAG coverage). */
export async function companyChunkCount(companyId: string): Promise<number> {
  return prisma.knowledgeChunk.count({ where: { scope: "company", companyId } });
}
