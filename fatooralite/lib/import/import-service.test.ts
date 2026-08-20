// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { hasTestDb, testClient } from "@/lib/db/test-db";
import { previewImport, commitImport, ImportHasErrorsError, ImportHeaderMismatchError, ImportTooLargeError, MAX_IMPORT_ROWS } from "./import-service";

let db: PrismaClient;
let companyId: string;
const VAT = "300000000001063";

const CUSTOMER_HEADER = "name,nameAr,vatNumber,crNumber,address,city,phone,email";
const PRODUCT_HEADER = "name,sku,unitPrice,vatCategory";

beforeAll(async () => {
  if (!hasTestDb) return;
  db = testClient();
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  const company = await db.company.create({ data: { name: "Import Co", vatNumber: VAT } });
  companyId = company.id;
}, 120_000);

afterAll(async () => {
  if (!db) return;
  await db.company.deleteMany({ where: { vatNumber: VAT } });
  await db.$disconnect();
});

describe.skipIf(!hasTestDb)("previewImport / commitImport — customers (N4)", () => {
  it("refuses a file whose header row doesn't match exactly", async () => {
    await expect(previewImport(companyId, "customers", "name,email\nAcme,a@b.com\n", db)).rejects.toThrow(ImportHeaderMismatchError);
  });

  it("refuses a file over the row cap", async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `C${i},,,,,,,`).join("\n");
    await expect(previewImport(companyId, "customers", `${CUSTOMER_HEADER}\n${rows}\n`, db)).rejects.toThrow(ImportTooLargeError);
  });

  it("verdicts: create, error, and duplicate rows all distinguished", async () => {
    const csv = [
      CUSTOMER_HEADER,
      "Good Co,,300000000001073,,,,,good@example.test", // create
      ",,,,,,,", // error: name required
      "Good Co,,300000000001073,,,,,dup@example.test", // duplicate of row 2 (same VAT), within-file
    ].join("\n");
    const preview = await previewImport(companyId, "customers", csv, db);
    expect(preview.summary).toEqual({ create: 1, skipDuplicate: 1, error: 1 });
    expect(preview.results.find((r) => r.row === 2)?.verdict).toBe("create");
    expect(preview.results.find((r) => r.row === 3)?.verdict).toBe("error");
    expect(preview.results.find((r) => r.row === 4)?.verdict).toBe("skip-duplicate");
  });

  it("commit refuses entirely when any row errors — nothing is inserted", async () => {
    const before = await db.customer.count({ where: { companyId } });
    const csv = [CUSTOMER_HEADER, "Valid Co,,,,,,,valid@example.test", ",,,,,,,"].join("\n");
    await expect(commitImport(companyId, "customers", csv, db)).rejects.toThrow(ImportHasErrorsError);
    expect(await db.customer.count({ where: { companyId } })).toBe(before);
  });

  it("commit inserts all create rows in one call, skips DB duplicates, and re-running is idempotent", async () => {
    const csv = [CUSTOMER_HEADER, "Fresh Co,,300000000001083,,,,,fresh@example.test"].join("\n");
    const first = await commitImport(companyId, "customers", csv, db);
    expect(first.summary.create).toBe(1);
    const created = await db.customer.findFirst({ where: { companyId, vatNumber: "300000000001083" } });
    expect(created).not.toBeNull();

    // Re-running the identical file is now a no-op against the DB — the row
    // is recognized as an existing duplicate, not inserted a second time.
    const second = await commitImport(companyId, "customers", csv, db);
    expect(second.summary).toEqual({ create: 0, skipDuplicate: 1, error: 0 });
    expect(await db.customer.count({ where: { companyId, vatNumber: "300000000001083" } })).toBe(1);
  }, 20_000);
});

describe.skipIf(!hasTestDb)("previewImport / commitImport — products (N4)", () => {
  it("a non-numeric unitPrice is an error, not a silent zero", async () => {
    const csv = [PRODUCT_HEADER, "Widget,,not-a-number,S"].join("\n");
    const preview = await previewImport(companyId, "products", csv, db);
    expect(preview.summary.error).toBe(1);
  });

  it("creates a valid product and detects a duplicate by sku", async () => {
    const csv = [PRODUCT_HEADER, "Widget,WID-1,10.50,S"].join("\n");
    const result = await commitImport(companyId, "products", csv, db);
    expect(result.summary.create).toBe(1);
    const again = await previewImport(companyId, "products", csv, db);
    expect(again.summary).toEqual({ create: 0, skipDuplicate: 1, error: 0 });
  }, 20_000);
});
