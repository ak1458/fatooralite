// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, encryptPrivateKey, decryptPrivateKey } from "./encrypt";

beforeAll(() => {
  // 32 raw bytes, base64 — the format lib/crypto/encrypt.ts requires.
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("CSID secret encryption at rest", () => {
  it("does not store the secret in clear text", () => {
    const secret = "zatca-csid-secret-value";
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(stored.split(":")).toHaveLength(3);
  });

  it("round-trips", () => {
    const secret = "zatca-csid-secret-value";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("returns a legacy clear-text secret unchanged", () => {
    // Rows written before the secret was wrapped hold plain text; reading one
    // must not throw or mangle it.
    expect(decryptSecret("LOCAL-DEV-SECRET")).toBe("LOCAL-DEV-SECRET");
    expect(decryptSecret("some:legacy:value-with-colons")).toBe("some:legacy:value-with-colons");
  });

  it("passes null and empty through untouched", () => {
    expect(decryptSecret(null)).toBeNull();
    expect(encryptSecret("")).toBe("");
  });

  it("still wraps private keys and refuses a tampered ciphertext", () => {
    const pem = "-----BEGIN EC PRIVATE KEY-----\nabc\n-----END EC PRIVATE KEY-----";
    const wrapped = encryptPrivateKey(pem);
    expect(wrapped).not.toContain("BEGIN EC PRIVATE KEY");
    expect(decryptPrivateKey(wrapped)).toBe(pem);

    // GCM authentication must reject a modified ciphertext rather than return
    // garbage plaintext.
    const [iv, tag, ct] = wrapped.split(":");
    const flipped = ct[0] === "A" ? "B" + ct.slice(1) : "A" + ct.slice(1);
    expect(() => decryptPrivateKey(`${iv}:${tag}:${flipped}`)).toThrow();
  });
});
