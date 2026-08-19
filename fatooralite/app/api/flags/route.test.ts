// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { FLAG_DEFAULTS } from "@/lib/flags/registry";

let db: PrismaClient;
let companyId: string;
let ownerCookie: string;
const VAT = "300000000001033";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Flags Route Co", vatNumber: VAT } });
  companyId = company.id;
  const owner = await db.user.create({
    data: { companyId, email: "flags-owner@team.example", name: "Flags Owner", role: "owner" },
  });
  ownerCookie = `${SESSION_COOKIE}=${await createSessionToken({
    userId: owner.id, email: owner.email, name: owner.name, role: owner.role,
    companyId, sessionVersion: owner.sessionVersion,
  })}`;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.user.deleteMany({ where: { email: "flags-owner@team.example" } });
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("GET /api/flags", () => {
  it("401s without a session", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/flags"));
    expect(res.status).toBe(401);
  });

  it("returns the resolved defaults for the caller's own company", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/flags", { headers: { cookie: ownerCookie } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flags).toEqual(FLAG_DEFAULTS);
  });

  it("has no parameter that could target another company's flags", async () => {
    const { GET } = await import("./route");
    // Even a caller who tries to smuggle a companyId via the query string gets
    // their own session's company back — the route never reads it.
    const res = await GET(
      new Request(`http://localhost/api/flags?companyId=someone-elses-id`, { headers: { cookie: ownerCookie } }),
    );
    const body = await res.json();
    expect(body.flags).toEqual(FLAG_DEFAULTS);
  });
});
