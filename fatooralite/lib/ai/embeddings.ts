/**
 * Provider-agnostic embeddings. Selected by EMBEDDING_PROVIDER:
 *
 *   local (default) — Xenova/all-MiniLM-L6-v2 (384-dim) in-process, no API key
 *   openai          — text-embedding-3-small (1536-dim), OPENAI_API_KEY
 *   voyage          — voyage-3.5-lite (1024-dim), VOYAGE_API_KEY (pairs with Anthropic)
 *
 * The vector store keeps a dimension-agnostic pgvector column and filters
 * retrieval by the query vector's dimension, so switching providers is safe —
 * but existing chunks must be re-ingested (POST /api/ai/ingest) to be
 * retrievable under the new model.
 */

import { pipeline } from "@huggingface/transformers";

export interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
}

// ---- Local (MiniLM) ---------------------------------------------------------

let extractorPromise: Promise<unknown> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractorPromise as Promise<(
    texts: string[],
    opts: { pooling: "mean"; normalize: boolean },
  ) => Promise<{ tolist: () => number[][] }>>;
}

const localProvider: EmbeddingProvider = {
  name: "local",
  async embed(texts) {
    const extractor = await getExtractor();
    const out = await extractor(texts, { pooling: "mean", normalize: true });
    return out.tolist();
  },
};

// ---- Hosted (OpenAI / Voyage share the same request shape) ------------------

function restProvider(
  name: string,
  url: string,
  apiKey: () => string | undefined,
  model: () => string,
): EmbeddingProvider {
  return {
    name,
    async embed(texts) {
      const key = apiKey();
      if (!key) throw new Error(`${name} embeddings: API key not configured`);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model(), input: texts }),
      });
      if (!res.ok) {
        throw new Error(`${name} embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data: { data: { index: number; embedding: number[] }[] } = await res.json();
      // Providers document input-order results, but sort by index to be safe.
      return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}

const openaiProvider = restProvider(
  "openai",
  "https://api.openai.com/v1/embeddings",
  () => process.env.OPENAI_API_KEY,
  () => process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
);

const voyageProvider = restProvider(
  "voyage",
  "https://api.voyageai.com/v1/embeddings",
  () => process.env.VOYAGE_API_KEY,
  () => process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3.5-lite",
);

export function getEmbeddingProvider(): EmbeddingProvider {
  switch ((process.env.EMBEDDING_PROVIDER || "local").toLowerCase()) {
    case "openai":
      return openaiProvider;
    case "voyage":
      return voyageProvider;
    default:
      return localProvider;
  }
}

// ---- Stable call-site API ---------------------------------------------------

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return getEmbeddingProvider().embed(texts);
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}
