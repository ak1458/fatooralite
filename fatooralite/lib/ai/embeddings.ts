import { pipeline } from "@huggingface/transformers";

/**
 * Local sentence embeddings (Xenova/all-MiniLM-L6-v2, 384-dim). Runs in Node with
 * no API key — real semantic vectors for RAG. The model is downloaded once and
 * cached; the pipeline is a lazy singleton so it loads only on first use.
 */
export const EMBED_DIM = 384;

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

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0];
}
