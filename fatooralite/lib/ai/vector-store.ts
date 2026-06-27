import { prisma } from "@/lib/db/client";
import { embed, embedOne } from "./embeddings";
import { topK } from "./vector";

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

/** Embed and store knowledge chunks. */
export async function upsertChunks(chunks: ChunkInput[]): Promise<number> {
  if (chunks.length === 0) return 0;
  const embeddings = await embed(chunks.map((c) => c.text));
  await prisma.knowledgeChunk.createMany({
    data: chunks.map((c, i) => ({
      scope: c.scope,
      companyId: c.companyId ?? null,
      source: c.source,
      text: c.text,
      embedding: embeddings[i],
    })),
  });
  return chunks.length;
}

/** Remove chunks for a given source (so re-ingest doesn't duplicate). */
export async function clearSource(source: string, companyId: string | null = null): Promise<void> {
  await prisma.knowledgeChunk.deleteMany({
    where: { source, ...(companyId ? { companyId } : { scope: "global" }) },
  });
}

/**
 * Retrieve the most relevant chunks for a query: global ZATCA knowledge plus the
 * caller's own company data. Cosine ranking happens in-app over the candidate set.
 */
export async function retrieve(
  query: string,
  companyId: string | null,
  k = 5,
  minScore = 0.15,
): Promise<Retrieved[]> {
  const q = await embedOne(query);
  const candidates = await prisma.knowledgeChunk.findMany({
    where: {
      OR: [{ scope: "global" }, ...(companyId ? [{ scope: "company", companyId }] : [])],
    },
    select: { text: true, source: true, embedding: true },
  });
  if (candidates.length === 0) return [];
  return topK(q, candidates, k)
    .filter((r) => r.score >= minScore)
    .map((r) => ({ text: r.item.text, source: r.item.source, score: r.score }));
}

export async function globalChunkCount(): Promise<number> {
  return prisma.knowledgeChunk.count({ where: { scope: "global" } });
}
