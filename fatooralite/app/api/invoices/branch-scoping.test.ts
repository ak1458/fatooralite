// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { generateKeyPair } from "@/lib/zatca/index";

/**
 * Phase 3 / W10: branches are locations of one VAT-registered entity, not a
 * security boundary — so this is NOT tenant isolation (that's covered
 * elsewhere). What must hold: a branchId from another company is refused,
 * not silently accepted or cross-attributed.
 */
let db: PrismaClient;
let companyId: string;
let otherCompanyId: string;
let ownBranchId: string;
let otherBranchId: string;
let ownerCookie: string;
// ZATCA VAT format: /^3\d{13}3$/ — must both start AND end with 3.
const VAT = "300000000000813";
const OTHER_VAT = "300000000000823";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });

  const company = await db.company.create({ data: { name: "Branch Co", vatNumber: VAT } });
  companyId = company.id;
  // A missing Subscription resolves to "expired" (invariant) and expired
  // tenants can't issue invoices (requireFeature) — this test is about
  // branch scoping, not billing, so give it an active plan.
  await db.subscription.create({ data: { companyId, plan: "pro", status: "active" } });
  const other = await db.company.create({ data: { name: "Other Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;

  const ownBranch = await db.branch.create({ data: { companyId, name: "HQ" } });
  ownBranchId = ownBranch.id;
  const otherBranch = await db.branch.create({ data: { companyId: otherCompanyId, name: "Other HQ" } });
  otherBranchId = otherBranch.id;

  const kp = generateKeyPair();
  await db.certificate.create({
    data: {
      companyId, kind: "production", status: "active",
      privateKey: kp.privateKeyPem, publicKey: kp.publicKeyPem,
      token: "test-token", secret: "test-secret",
    },
  });

  const owner = await db.user.create({
    data: { companyId, email: "branch-owner@team.example", name: "Branch Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 180_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "branch-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

const standardInput = {
  invoiceNumber: "",
  kind: "standard" as const,
  issueDate: "2026-08-12",
  buyer: { name: "Walk-in", vatNumber: "300000000000003" },
  lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
};

describe.skipIf(!hasTestDb)("branchId scoping (W10)", () => {
  it("issuing with the caller's own branchId succeeds and persists it", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, branchId: ownBranchId, input: { ...standardInput, invoiceNumber: "BR-1" } }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const row = await db.invoice.findUnique({ where: { id: body.invoiceId }, select: { branchId: true } });
    expect(row?.branchId).toBe(ownBranchId);
  }, 20_000);

  it("issuing with another company's branchId is refused, not cross-attributed", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, branchId: otherBranchId, input: { ...standardInput, invoiceNumber: "BR-2" } }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("omitting branchId still succeeds (it's optional, not required)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: ownerCookie, "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, input: { ...standardInput, invoiceNumber: "BR-3" } }),
      }),
    );
    expect(res.status).toBe(201);
  }, 20_000);

  it("GET filters the list to only the requested branch", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(`http://localhost/api/invoices?companyId=${companyId}&branchId=${ownBranchId}`, {
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const expectedCount = await db.invoice.count({ where: { companyId, branchId: ownBranchId } });
    expect(data.invoices).toHaveLength(expectedCount);
    expect(expectedCount).toBeGreaterThan(0);
  });

  it("GET refuses another company's branchId rather than silently returning an empty/cross-tenant list", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(`http://localhost/api/invoices?companyId=${companyId}&branchId=${otherBranchId}`, {
        headers: { cookie: ownerCookie },
      }),
    );
    expect(res.status).toBe(400);
  });
});
