import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { registerCompany, RegisterError } from "./auth-service";

let db: PrismaClient;

// The test branch already carries the schema; clean only this suite's fixtures
// so runs are repeatable without a destructive force-reset of the database.
async function cleanFixtures(client: PrismaClient) {
  await client.user.deleteMany({ where: { email: { endsWith: "@acme.com" } } });
  await client.company.deleteMany({ where: { name: "Acme Trading" } });
}

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await cleanFixtures(db);
}, 120_000);

afterAll(async () => {
  if (db) {
    await cleanFixtures(db);
    await db.$disconnect();
  }
});

const base = { name: "Ali Hassan", password: "secret12", companyName: "Acme Trading" };

describe.skipIf(!hasTestDb)("registerCompany", () => {
  it("creates a company (pending onboarding) and an owner user with a hashed password", async () => {
    const { company, user } = await registerCompany(
      { ...base, email: "owner1@acme.com", vatNumber: "300000000000003" },
      db,
    );
    expect(company.onboardingStatus).toBe("pending");
    expect(company.name).toBe("Acme Trading");
    expect(user.role).toBe("owner");
    expect(user.companyId).toBe(company.id);
    expect(user.email).toBe("owner1@acme.com");
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordHash).not.toBe("secret12");
  });

  it("rejects a duplicate email", async () => {
    await registerCompany({ ...base, email: "dup@acme.com", vatNumber: "300000000000011" }, db);
    await expect(
      registerCompany({ ...base, email: "dup@acme.com", vatNumber: "300000000000029" }, db),
    ).rejects.toThrow(RegisterError);
  });

  it("rejects a duplicate VAT number", async () => {
    await registerCompany({ ...base, email: "e1@acme.com", vatNumber: "300000000000037" }, db);
    await expect(
      registerCompany({ ...base, email: "e2@acme.com", vatNumber: "300000000000037" }, db),
    ).rejects.toThrow(/vat/i);
  });
});
