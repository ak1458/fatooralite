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
    const token = await createSessionToken({ userId: "u1", email: "a@b.c", name: "A", role: "owner" });
    const payload = await verifySessionToken(token);
    expect(payload?.userId).toBe("u1");
    expect(payload?.role).toBe("owner");
  });
  it("rejects a tampered token", async () => {
    const token = await createSessionToken({ userId: "u1", email: "a@b.c", name: "A", role: "owner" });
    expect(await verifySessionToken(token + "x")).toBeNull();
    expect(await verifySessionToken("garbage")).toBeNull();
  });
});
