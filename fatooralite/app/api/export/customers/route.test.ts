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
const VAT = "300000000001133";
const OTHER_VAT = "300000000001143";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  const company = await db.company.create({ data: { name: "Export Co", vatNumber: VAT } });
  companyId = company.id;
  const other = await db.company.create({ data: { name: "Other Export Co", vatNumber: OTHER_VAT } });
  otherCompanyId = other.id;

  // Formula-injection probe: a name that a spreadsheet would evaluate if exported unescaped.
  await db.customer.create({ data: { companyId, name: "=HYPERLINK(\"http://evil.example\")", email: "buyer@example.test" } });

  const owner = await db.user.create({ data: { companyId, email: "export-owner@team.example", name: "Owner", role: "owner" } });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role, companyId, sessionVersion: owner.sessionVersion,
  })}`;
  const otherOwner = await db.user.create({ data: { companyId: otherCompanyId, email: "export-other-owner@team.example", name: "Other Owner", role: "owner" } });
  otherOwnerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: otherOwner.id, email: otherOwner.email, name: otherOwner.name, role: otherOwner.role, companyId: otherCompanyId, sessionVersion: otherOwner.sessionVersion,
  })}`;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: { in: ["export-owner@team.example", "export-other-owner@team.example"] } } });
  await db.company.deleteMany({ where: { vatNumber: { in: [VAT, OTHER_VAT] } } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("GET /api/export/customers (N4)", () => {
  it("401s without a session", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request(`http://localhost/api/export/customers?companyId=${companyId}`));
    expect(res.status).toBe(401);
  });

  it("403s for another company's companyId", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(`http://localhost/api/export/customers?companyId=${companyId}`, { headers: { cookie: otherOwnerCookie } }),
    );
    expect(res.status).toBe(403);
  });

  it("neutralizes a formula-injection-shaped name with a leading apostrophe", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request(`http://localhost/api/export/customers?companyId=${companyId}`, { headers: { cookie: ownerCookie } }),
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example"")"');
    expect(csv).not.toMatch(/^=HYPERLINK/m);
  });
});
