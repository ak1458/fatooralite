/** Cosine similarity of two equal-length vectors. Returns 0 if either is zero. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface Embedded<T> {
  item: T;
  score: number;
}

/** Rank `items` by cosine similarity to `query` and return the top `k`. */
export function topK<T extends { embedding: number[] }>(
  query: number[],
  items: T[],
  k: number,
): Embedded<T>[] {
  return items
    .map((item) => ({ item, score: cosineSimilarity(query, item.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
