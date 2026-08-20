// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

let db: PrismaClient;
let companyId: string;
let otherCompanyId: string;
let ownerCookie: string;
let otherOwnerCookie: string;
const VAT = "300000000001163";
const OTHER_VAT = "300000000001173";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  const company = await db.company.create({ data: { name: "Export Products Co", vatNumber: VAT } });
  companyId = company.id;
  const other = await db.company.create({ data: { name: "Other Export Products Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;
  await db.product.create({ data: { companyId, name: "Widget", sku: "WID-1", unitPrice: 10.5 } });

  const owner = await db.user.create({ data: { companyId, email: "export-products-owner@team.example", name: "Owner", role: "owner" } });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role, companyId, sessionVersion: owner.sessionVersion,
  })}`;
  const otherOwner = await db.user.create({ data: { companyId: otherCompanyId, email: "export-products-other-owner@team.example", name: "Other Owner", role: "owner" } });
  otherOwnerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: otherOwner.id, email: otherOwner.email, name: otherOwner.name, role: otherOwner.role, companyId: otherCompanyId, sessionVersion: otherOwner.sessionVersion,
  })}`;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ["export-products-owner@team.example", "export-products-other-owner@team.example"] } } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("GET /api/export/products (N4 smoke)", () => {
  it("403s for another company's companyId", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request(`http://localhost/api/export/products?companyId=${companyId}`, { headers: { cookie: otherOwnerCookie } }));
    expect(res.status).toBe(403);
  });

  it("returns the company's products as CSV", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request(`http://localhost/api/export/products?companyId=${companyId}`, { headers: { cookie: ownerCookie } }));
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("Widget,WID-1,10.5,S");
  });
});
