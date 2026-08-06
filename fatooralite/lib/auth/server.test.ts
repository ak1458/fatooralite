// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, pushTestSchema, testClient } from "@/lib/db/test-db";
import { hasCurrentSessionVersion, isCallerCompany } from "./server";
import type { SessionPayload } from "./session";

// Regression coverage for a same-day fix: `sessionVersion` was minted at
// login and incremented at password reset, but nothing ever verified it —
// a stolen session cookie stayed valid for its full 7-day life even after
// the legitimate user reset their password. See handoff.md for the incident.

let db: PrismaClient;

beforeAll(() => {
  if (!hasTestDb) return;
  pushTestSchema();
  db = testClient();
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
});

function payload(userId: string, sessionVersion: number, companyId?: string): SessionPayload {
  return { userId, email: "a@b.c", name: "A", role: "owner", sessionVersion, companyId };
}

// Regression coverage for a same-day fix: two more copies of the falsy-
// companyId IDOR bug class (see requirePermission's targetCompanyId check
// below) were found live in app/api/ai/route.ts and app/api/ai/agent/
// route.ts — a company-less session (User.companyId is nullable, a real
// reachable state) short-circuited a truthy guard to *allow* an attacker-
// supplied companyId through. All three call sites now share this one
// pure, deny-by-default helper instead of re-deriving the check.
describe("isCallerCompany", () => {
  it("allows when no companyId is asserted", () => {
    expect(isCallerCompany(payload("u1", 0, "companyA"), undefined)).toBe(true);
    expect(isCallerCompany(payload("u1", 0, "companyA"), null)).toBe(true);
  });

  it("allows when the caller's companyId matches", () => {
    expect(isCallerCompany(payload("u1", 0, "companyA"), "companyA")).toBe(true);
  });

  it("denies when the caller's companyId does not match", () => {
    expect(isCallerCompany(payload("u1", 0, "companyA"), "companyB")).toBe(false);
  });

  it("denies a company-less session asserting any companyId (the fixed bug)", () => {
    expect(isCallerCompany(payload("u1", 0, undefined), "companyB")).toBe(false);
  });

  it("denies a null user asserting any companyId", () => {
    expect(isCallerCompany(null, "companyB")).toBe(false);
  });
});

describe.skipIf(!hasTestDb)("hasCurrentSessionVersion", () => {
  it("accepts a token whose sessionVersion matches the current DB value", async () => {
    const user = await db.user.create({ data: { email: "sv-match@test.example", name: "A", sessionVersion: 0 } });
    expect(await hasCurrentSessionVersion(payload(user.id, 0), db)).toBe(true);
  });

  it("rejects a token minted before a password reset incremented sessionVersion", async () => {
    const user = await db.user.create({ data: { email: "sv-stale@test.example", name: "A", sessionVersion: 0 } });
    // Simulates POST /api/auth/reset's sessionVersion: { increment: 1 }.
    await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
    // This is the exact old token shape — minted with the pre-reset version.
    expect(await hasCurrentSessionVersion(payload(user.id, 0), db)).toBe(false);
  });

  it("fails closed for a deleted/nonexistent user", async () => {
    expect(await hasCurrentSessionVersion(payload("does-not-exist", 0), db)).toBe(false);
  });
});
