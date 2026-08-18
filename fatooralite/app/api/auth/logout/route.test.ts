// @vitest-environment node
// jose signs with a Uint8Array; under jsdom the encoder returns one from a
// different realm and the signature call rejects it. Same directive as
// lib/auth/auth.test.ts and lib/auth/server.test.ts.
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { hasCurrentSessionVersion } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

/**
 * Logging out has to revoke the session on the server, not only clear the
 * cookie. The session is a stateless 7-day JWT: before this, a token captured
 * before logout stayed valid for its full life, so "sign out" protected nobody
 * who had already lost control of the cookie.
 */
let db: PrismaClient;
const EMAIL = "logout-probe@team.example";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.user.deleteMany({ where: { email: EMAIL } });
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("POST /api/auth/logout", () => {
  it("increments sessionVersion, which invalidates the presented token", async () => {
    const user = await db.user.create({
      data: { email: EMAIL, name: "Logout Probe", role: "owner", passwordHash: hashPassword("auditPassw0rd!") },
    });

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: undefined,
      sessionVersion: user.sessionVersion,
    };
    const token = await createSessionToken(payload);

    // The token is accepted before logout.
    expect(await hasCurrentSessionVersion(payload, db)).toBe(true);

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=${token}` },
      }),
    );
    expect(res.status).toBe(200);

    // The same token is refused afterwards.
    const after = await db.user.findUnique({ where: { id: user.id }, select: { sessionVersion: true } });
    expect(after?.sessionVersion).toBe(user.sessionVersion + 1);
    expect(await hasCurrentSessionVersion(payload, db)).toBe(false);
  });

  it("still clears the cookie when there is no session to revoke", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toContain(`${SESSION_COOKIE}=`);
  });
});
