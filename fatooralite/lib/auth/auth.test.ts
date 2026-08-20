// @vitest-environment node
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { can } from "./rbac";
import { createSessionToken, verifySessionToken } from "./session";

describe("password", () => {
  it("verifies a correct password and rejects a wrong one", () => {
    const stored = hashPassword("owner1234");
    expect(verifyPassword("owner1234", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
  it("produces a salt:hash format", () => {
    expect(hashPassword("x")).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });
});

describe("rbac", () => {
  it("grants owner everything and employee only create", () => {
    expect(can("owner", "invoice:clear")).toBe(true);
    expect(can("owner", "users:manage")).toBe(true);
    expect(can("employee", "invoice:create")).toBe(true);
    expect(can("employee", "invoice:clear")).toBe(false);
  });
  it("auditor can view audit but not create", () => {
    expect(can("auditor", "audit:view")).toBe(true);
    expect(can("auditor", "invoice:create")).toBe(false);
  });
  it("unknown role has no permissions", () => {
    expect(can("nope", "invoice:create")).toBe(false);
  });
});

describe("session token", () => {
  it("round-trips a payload", async () => {
    const token = await createSessionToken({ userId: "u1", email: "a@b.c", name: "A", role: "owner", sessionVersion: 0 });
    const payload = await verifySessionToken(token);
    expect(payload?.userId).toBe("u1");
    expect(payload?.role).toBe("owner");
  });
  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ userId: "u1", email: "a@b.c", name: "A", role: "owner", sessionVersion: 0 });
    expect(await verifySessionToken(token + "x")).toBeNull();
    expect(await verifySessionToken("garbage")).toBeNull();
  });

  // W19 — the refresh window reads `iat` off the verified payload, so the
  // round-trip has to actually expose it before any refresh logic can work.
  it("round-trip exposes iat", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createSessionToken({ userId: "u1", email: "a@b.c", name: "A", role: "owner", sessionVersion: 0 });
    const payload = await verifySessionToken(token);
    expect(payload?.iat).toBeGreaterThanOrEqual(before);
    expect(payload?.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1);
  });

  it("backdates iat verifiably via opts.issuedAt", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const token = await createSessionToken(
      { userId: "u1", email: "a@b.c", name: "A", role: "owner", sessionVersion: 0 },
      { issuedAt: twoDaysAgo },
    );
    const payload = await verifySessionToken(token);
    expect(payload?.iat).toBe(Math.floor(twoDaysAgo.getTime() / 1000));
  });

  it("re-minting from a payload with a stale iat produces a token whose iat is now", async () => {
    const old = await createSessionToken(
      { userId: "u1", email: "a@b.c", name: "A", role: "owner", sessionVersion: 0 },
      { issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    );
    const decoded = await verifySessionToken(old);
    expect(decoded).not.toBeNull();
    const before = Math.floor(Date.now() / 1000);
    // Simulates the refresh path: re-mint from a payload that still carries the old iat.
    const refreshed = await createSessionToken(decoded!);
    const payload = await verifySessionToken(refreshed);
    expect(payload?.iat).toBeGreaterThanOrEqual(before);
  });
});
