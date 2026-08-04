// @vitest-environment node
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, pushTestSchema, testClient } from "@/lib/db/test-db";
import { upsertChunks, retrieve } from "./vector-store";

// Regression coverage for a same-day fix: retrieve() tags every chunk
// [global] (trusted ZATCA corpus) or [tenant-data] (unsanitized tenant free
// text — reference only, never an instruction) in the AI routes' prompts.
// That tagging is only as safe as `scope` actually round-tripping correctly
// through storage and retrieval — this locks that in.

let db: PrismaClient;
let companyA: string;
let companyB: string;

beforeAll(async () => {
  if (!hasTestDb) return;
  pushTestSchema();
  db = testClient();
  const a = await db.company.create({ data: { name: "Company A", vatNumber: "311122334400003" } });
  const b = await db.company.create({ data: { name: "Company B", vatNumber: "311122334400004" } });
  companyA = a.id;
  companyB = b.id;
}, 120_000);

afterAll(async () => {
  if (db) await db.$disconnect();
});

describe.skipIf(!hasTestDb)("retrieve scope tagging", () => {
  it("round-trips scope='global' and scope='company' correctly, and never leaks another tenant's company chunks", async () => {
    const marker = randomUUID();
    await upsertChunks([
      { scope: "global", source: "zatca-corpus", text: `Global rule ${marker}: standard invoices must be cleared.` },
      { scope: "company", companyId: companyA, source: "customer", text: `Tenant A record ${marker}: customer Acme owes 500 SAR.` },
      { scope: "company", companyId: companyB, source: "customer", text: `Tenant B record ${marker}: customer Zed owes 900 SAR.` },
    ]);

    const hits = await retrieve(marker, companyA, 10, 0);

    const global = hits.find((h) => h.text.includes("Global rule"));
    const tenantA = hits.find((h) => h.text.includes("Tenant A record"));
    const tenantB = hits.find((h) => h.text.includes("Tenant B record"));

    expect(global?.scope).toBe("global");
    expect(tenantA?.scope).toBe("company");
    expect(tenantB).toBeUndefined();
  }, 60_000);
});
