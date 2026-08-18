// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { recordSecurityEvent, querySecurityEvents, redact, SECURITY_EVENTS } from "./events";

let db: PrismaClient;
const CO_A = "audit-co-a";
const CO_B = "audit-co-b";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
}, 180_000);

beforeEach(async () => {
  if (!hasTestDb) return;
  await db.securityEvent.deleteMany({ where: { companyId: { in: [CO_A, CO_B] } } });
  await db.securityEvent.deleteMany({ where: { actorEmail: { endsWith: "@audit-events.example" } } });
});

afterAll(async () => {
  if (!db) return;
  await db.securityEvent.deleteMany({ where: { companyId: { in: [CO_A, CO_B] } } });
  await db.securityEvent.deleteMany({ where: { actorEmail: { endsWith: "@audit-events.example" } } });
  await db.$disconnect();
});

// redact() is pure, so it is tested without a database.
describe("redact", () => {
  it("keeps ordinary fields", () => {
    expect(redact({ role: "owner", count: 3, ok: true })).toBe('{"role":"owner","count":3,"ok":true}');
  });

  it("removes anything whose key looks sensitive", () => {
    const out = JSON.parse(redact({
      password: "hunter2",
      newPassword: "hunter3",
      csidSecret: "s3cr3t",
      apiKey: "sk-live-abc",
      sessionCookie: "fl_session=x",
      authorization: "Basic abc",
      otp: "123456",
      nonce: "n",
      privateKeyPem: "-----BEGIN",
      role: "owner",
    })!);
    for (const k of ["password", "newPassword", "csidSecret", "apiKey", "sessionCookie", "authorization", "otp", "nonce", "privateKeyPem"]) {
      expect(out[k]).toBe("[redacted]");
    }
    expect(out.role).toBe("owner");
  });

  it("never lets a secret value through under a redacted key", () => {
    const json = redact({ password: "hunter2", token: "abc123" })!;
    expect(json).not.toContain("hunter2");
    expect(json).not.toContain("abc123");
  });

  it("clamps long values and returns null for nothing", () => {
    const out = JSON.parse(redact({ note: "x".repeat(500) })!);
    expect(out.note.length).toBeLessThanOrEqual(201);
    expect(redact(null)).toBeNull();
  });
});

describe.skipIf(!hasTestDb)("security event log", () => {
  it("records an event with tenant and actor context", async () => {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.loginSuccess,
      outcome: "success",
      companyId: CO_A,
      actorId: "user-1",
      actorEmail: "Owner@Audit-Events.example",
      metadata: { role: "owner" },
    }, db);

    const [event] = await querySecurityEvents({ companyId: CO_A }, db);
    expect(event.action).toBe("auth.login.success");
    expect(event.outcome).toBe("success");
    expect(event.actorId).toBe("user-1");
    // Stored lower-cased, matching how addresses are normalised everywhere else.
    expect(event.actorEmail).toBe("owner@audit-events.example");
    expect(JSON.parse(event.metadata!)).toEqual({ role: "owner" });
  });

  it("captures IP and user agent from a request", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.9, 203.0.113.5", "user-agent": "probe/1.0" },
    });
    await recordSecurityEvent({
      action: SECURITY_EVENTS.loginFailure, outcome: "failure",
      companyId: CO_A, actorEmail: "x@audit-events.example", request: req,
    }, db);

    const [event] = await querySecurityEvents({ companyId: CO_A }, db);
    // Rightmost entry, same rule the rate limiter uses — the caller cannot
    // choose what gets recorded about it.
    expect(event.ip).toBe("203.0.113.5");
    expect(event.userAgent).toBe("probe/1.0");
  });

  it("never stores a secret passed in metadata", async () => {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.passwordResetCompleted, outcome: "success",
      companyId: CO_A, actorEmail: "y@audit-events.example",
      metadata: { password: "hunter2", csidSecret: "zatca-secret", ok: true },
    }, db);

    const [event] = await querySecurityEvents({ companyId: CO_A }, db);
    expect(event.metadata).not.toContain("hunter2");
    expect(event.metadata).not.toContain("zatca-secret");
    expect(JSON.parse(event.metadata!).ok).toBe(true);
  });

  it("keeps one tenant's events out of another's view", async () => {
    await recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_A, actorEmail: "a@audit-events.example" }, db);
    await recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_B, actorEmail: "b@audit-events.example" }, db);

    const a = await querySecurityEvents({ companyId: CO_A }, db);
    const b = await querySecurityEvents({ companyId: CO_B }, db);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].actorEmail).toBe("a@audit-events.example");
    expect(b[0].actorEmail).toBe("b@audit-events.example");
  });

  it("hides tenant-less events from every tenant", async () => {
    // A failed login for an address matching no account has no tenant. If those
    // surfaced in any company's view, the log would confirm account existence.
    await recordSecurityEvent({
      action: SECURITY_EVENTS.loginFailure, outcome: "failure",
      companyId: null, actorEmail: "nobody@audit-events.example",
      metadata: { reason: "unknown_account" },
    }, db);

    expect(await querySecurityEvents({ companyId: CO_A }, db)).toHaveLength(0);
    expect(await querySecurityEvents({ companyId: CO_B }, db)).toHaveLength(0);
    // It is still recorded — just not tenant-visible.
    expect(await db.securityEvent.count({ where: { actorEmail: "nobody@audit-events.example" } })).toBe(1);
  });

  it("filters by action, outcome and actor", async () => {
    await recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_A, actorId: "u1", actorEmail: "u1@audit-events.example" }, db);
    await recordSecurityEvent({ action: SECURITY_EVENTS.loginFailure, outcome: "failure", companyId: CO_A, actorId: "u1", actorEmail: "u1@audit-events.example" }, db);
    await recordSecurityEvent({ action: SECURITY_EVENTS.permissionDenied, outcome: "denied", companyId: CO_A, actorId: "u2", actorEmail: "u2@audit-events.example" }, db);

    expect(await querySecurityEvents({ companyId: CO_A, action: "auth.login.failure" }, db)).toHaveLength(1);
    expect(await querySecurityEvents({ companyId: CO_A, outcome: "denied" }, db)).toHaveLength(1);
    expect(await querySecurityEvents({ companyId: CO_A, actorId: "u1" }, db)).toHaveLength(2);
  });

  it("filters by time range", async () => {
    await recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_A, actorEmail: "t@audit-events.example" }, db);
    const future = new Date(Date.now() + 3_600_000);
    expect(await querySecurityEvents({ companyId: CO_A, from: future }, db)).toHaveLength(0);
    expect(await querySecurityEvents({ companyId: CO_A, to: future }, db)).toHaveLength(1);
  });

  it("returns newest first and honours the limit", async () => {
    for (const n of ["1", "2", "3"]) {
      await recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_A, actorId: n, actorEmail: `${n}@audit-events.example` }, db);
    }
    const page = await querySecurityEvents({ companyId: CO_A, limit: 2 }, db);
    expect(page).toHaveLength(2);
    expect(page[0].createdAt.getTime()).toBeGreaterThanOrEqual(page[1].createdAt.getTime());
  });

  it("does not throw when the write fails", async () => {
    // An audit trail that can take down the action it describes is worse than
    // none, so a broken client must be swallowed rather than propagated.
    const broken = { securityEvent: { create: () => Promise.reject(new Error("db down")) } } as unknown as PrismaClient;
    await expect(
      recordSecurityEvent({ action: SECURITY_EVENTS.loginSuccess, outcome: "success", companyId: CO_A }, broken),
    ).resolves.toBeUndefined();
  });
});
