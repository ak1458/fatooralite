import { describe, it, expect } from "vitest";
import { cosineSimilarity, topK } from "./vector";

describe("cosineSimilarity", () => {
  it("is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });
  it("is 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
  it("is -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 5);
  });
  it("returns 0 when a vector is all zeros (no divide-by-zero)", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("topK", () => {
  const items = [
    { id: "a", embedding: [1, 0, 0] },
    { id: "b", embedding: [0.9, 0.1, 0] },
    { id: "c", embedding: [0, 1, 0] },
  ];
  it("ranks by similarity to the query and limits to k", () => {
    const res = topK([1, 0, 0], items, 2);
    expect(res.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });
});
