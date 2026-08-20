// @vitest-environment node
// jose signs with a Uint8Array; under jsdom the encoder returns one from a
// different realm and the signature call rejects it. Same directive as
// lib/auth/auth.test.ts and lib/auth/server.test.ts.
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Phase 4 / W19: GET /api/auth/me is the natural refresh point (called on
 * every app-shell load). Refresh must only ever EXTEND a genuinely valid
 * session, and revocation must dominate it — a token whose sessionVersion is
 * stale must never be refreshed, only rejected.
 */
let db: PrismaClient;
const EMAIL = "session-refresh-probe@team.example";
const ALL_EMAILS = [EMAIL, `2-${EMAIL}`, `3-${EMAIL}`, `4-${EMAIL}`];

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ALL_EMAILS } } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("GET /api/auth/me — sliding session refresh (W19)", () => {
  it("does not refresh a fresh token — no gratuitous rotation", async () => {
    const user = await db.user.create({
      data: { email: EMAIL, name: "Refresh Probe", role: "owner" },
    });
    const token = await createSessionToken({
      userId: user.id, email: user.email, name: user.name, role: user.role,
      companyId: undefined, sessionVersion: user.sessionVersion,
    });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/me", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeNull();
  }, 20_000);

  it("refreshes a token older than the refresh window, carrying the DB's current sessionVersion", async () => {
    const user = await db.user.create({
      data: { email: `2-${EMAIL}`, name: "Refresh Probe 2", role: "owner" },
    });
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const token = await createSessionToken(
      { userId: user.id, email: user.email, name: user.name, role: user.role, companyId: undefined, sessionVersion: user.sessionVersion },
      { issuedAt: twoDaysAgo },
    );

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/me", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);

    const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const { verifySessionToken } = await import("@/lib/auth/session");
    const refreshedPayload = await verifySessionToken(match![1]);
    expect(refreshedPayload?.userId).toBe(user.id);
    expect(refreshedPayload?.sessionVersion).toBe(user.sessionVersion);
    expect(refreshedPayload!.iat!).toBeGreaterThan(Math.floor(twoDaysAgo.getTime() / 1000));
  }, 20_000);

  it("revocation dominates refresh: a stale sessionVersion gets no refresh at all", async () => {
    const user = await db.user.create({
      data: { email: `3-${EMAIL}`, name: "Refresh Probe 3", role: "owner" },
    });
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    // Token minted with a sessionVersion the DB has already moved past —
    // simulates a token issued before a logout/password-reset revoked it.
    const token = await createSessionToken(
      { userId: user.id, email: user.email, name: user.name, role: user.role, companyId: undefined, sessionVersion: user.sessionVersion + 1 },
      { issuedAt: twoDaysAgo },
    );

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/me", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
  }, 20_000);

  it("a refreshed token carries a role changed in the DB since the old token was issued", async () => {
    const user = await db.user.create({
      data: { email: `4-${EMAIL}`, name: "Refresh Probe 4", role: "employee" },
    });
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const token = await createSessionToken(
      { userId: user.id, email: user.email, name: user.name, role: "employee", companyId: undefined, sessionVersion: user.sessionVersion },
      { issuedAt: twoDaysAgo },
    );
    await db.user.update({ where: { id: user.id }, data: { role: "owner" } });

    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/auth/me", { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    const { verifySessionToken } = await import("@/lib/auth/session");
    const refreshedPayload = await verifySessionToken(match![1]);
    expect(refreshedPayload?.role).toBe("owner");
  }, 20_000);
});
