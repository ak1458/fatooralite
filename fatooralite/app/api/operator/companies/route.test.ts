// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";

/**
 * D7 (docs/audit/decision-register.md) — Option C: a read-only, cross-tenant
 * operator surface, gated by the same OPERATOR_SECRET pattern as W6's
 * global RAG re-index. No tenant session, however privileged, may reach
 * this — there is deliberately no platform-admin User role in this app.
 */
let db: PrismaClient;
let companyId: string;
const VAT = "300000000000843";
const originalOperatorSecret = process.env.OPERATOR_SECRET;

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Operator View Co", vatNumber: VAT } });
  companyId = company.id;
  await db.subscription.create({ data: { companyId, plan: "pro", status: "active" } });
  await db.certificate.create({
    data: { companyId, kind: "production", status: "active" },
  });
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

beforeEach(() => { delete process.env.OPERATOR_SECRET; });
afterEach(() => {
  if (originalOperatorSecret === undefined) delete process.env.OPERATOR_SECRET;
  else process.env.OPERATOR_SECRET = originalOperatorSecret;
});

describe.skipIf(!hasTestDb)("GET /api/operator/companies — cross-tenant read authorization", () => {
  it("refuses when OPERATOR_SECRET is not configured at all", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/operator/companies"));
    expect(res.status).toBe(403);
  });

  it("refuses a guessed/forged bearer token", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/companies", {
        headers: { authorization: "Bearer guessed-value" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("a tenant session cookie alone (no operator bearer) is refused — no such thing as a privileged tenant role here", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth/session");
    const owner = await db.user.create({
      data: { companyId, email: "operator-view-owner@team.example", name: "Owner", role: "owner" },
    });
    const cookie = `${SESSION_COOKIE}=${await createSessionToken({
      userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
      companyId, sessionVersion: owner.sessionVersion,
    })}`;
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/operator/companies", { headers: { cookie } }));
    expect(res.status).toBe(403);
    await db.user.deleteMany({ where: { email: "operator-view-owner@team.example" } });
  });

  it("the correct operator credential sees every tenant, with the D7-scoped fields and no HTTP write path", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/companies", {
        headers: { authorization: "Bearer real-operator-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.companies.find((c: { id: string }) => c.id === companyId);
    expect(row).toBeTruthy();
    expect(row.licenseState).toEqual({ plan: "pro", status: "active", trialEndsAt: null, currentPeriodEnd: null });
    expect(row.zatcaStatus).toMatchObject({ kind: "production", status: "active" });
    expect(row.version).toBe("n/a");
    expect(row).not.toHaveProperty("vatPrivateKey");

    const { POST } = (await import("./route")) as { POST?: unknown };
    expect(POST).toBeUndefined();
  });

  it("both a denied and a successful read are recorded as SecurityEvents (audited privileged reads)", async () => {
    await db.securityEvent.deleteMany({ where: { action: { in: ["operator.access.denied", "operator.companies.viewed"] } } });

    const { GET } = await import("./route");
    await GET(new Request("http://localhost/api/operator/companies"));
    process.env.OPERATOR_SECRET = "real-operator-secret";
    await GET(new Request("http://localhost/api/operator/companies", { headers: { authorization: "Bearer real-operator-secret" } }));

    const denied = await db.securityEvent.findFirst({ where: { action: "operator.access.denied" } });
    const viewed = await db.securityEvent.findFirst({ where: { action: "operator.companies.viewed" } });
    expect(denied?.outcome).toBe("denied");
    expect(viewed?.outcome).toBe("success");
  });
});
