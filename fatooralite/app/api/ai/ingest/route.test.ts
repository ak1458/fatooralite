// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Phase 2 / W6 — F-11: a global RAG re-index used to need only
 * settings:manage, held by every tenant owner. Now it needs an operator
 * credential (OPERATOR_SECRET) that no tenant session can ever present.
 *
 * Adversarial scenario from the remediation brief:
 *   Customer A -> manipulate request -> trigger global re-index -> DENIED.
 */
let db: PrismaClient;
let companyId: string;
let ownerCookie: string;
const VAT = "300000000000806";
const originalOperatorSecret = process.env.OPERATOR_SECRET;

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Ingest Co", vatNumber: VAT } });
  companyId = company.id;
  const owner = await db.user.create({
    data: { companyId, email: "ingest-owner@team.example", name: "Ingest Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "ingest-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

beforeEach(() => { delete process.env.OPERATOR_SECRET; });
afterEach(() => {
  if (originalOperatorSecret === undefined) delete process.env.OPERATOR_SECRET;
  else process.env.OPERATOR_SECRET = originalOperatorSecret;
});

describe.skipIf(!hasTestDb)("POST /api/ai/ingest — global scope authorization", () => {
  it("a tenant owner (with settings:manage) cannot trigger a global re-index — no OPERATOR_SECRET configured", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("a tenant owner cannot trigger a global re-index even by guessing/forging a bearer token", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret-value";
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: {
          cookie: ownerCookie,
          "Content-Type": "application/json",
          authorization: "Bearer guessed-or-forged-value",
        },
        body: JSON.stringify({ scope: "global" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("an unauthenticated caller with no session at all still cannot trigger a global re-index", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("the correct operator credential can trigger a global re-index", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret-value";
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer real-operator-secret-value",
        },
        body: JSON.stringify({ scope: "global" }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.totalGlobal).toBe("number");
  }, 60_000);

  it("a tenant owner can still re-index their own company data (unchanged)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "company" }),
      }),
    );
    expect(res.status).toBe(200);
  }, 60_000);

  it("an empty body defaults to company scope, not global — no accidental global blast radius", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/ai/ingest", {
        method: "POST",
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("totalCompany");
    expect(data).not.toHaveProperty("totalGlobal");
  }, 60_000);
});
