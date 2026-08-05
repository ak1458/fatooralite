import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInvoiceSchema } from "./schemas";

/**
 * The seller identity printed on a signed invoice and encoded into its
 * verification QR must come from the authenticated tenant, never from the
 * request body. A client-supplied seller let any authenticated user issue a
 * cryptographically signed document bearing another business's VAT number —
 * stored under their own company, so not a data leak, but a false identity
 * assertion, which for a compliance product is worse.
 *
 * Structural, because the failure mode is someone deleting the override in
 * app/api/invoices/route.ts, which no unit test of the schema would catch.
 */
describe("seller identity is server-derived", () => {
  const route = readFileSync(join(process.cwd(), "app", "api", "invoices", "route.ts"), "utf8");

  it("reads the seller from the database, keyed by the verified companyId", () => {
    expect(route).toContain("prisma.company.findUnique");
    expect(route).toMatch(/where:\s*\{\s*id:\s*companyId\s*\}/);
  });

  it("overrides seller after spreading the validated body, not before", () => {
    // Order matters: `{ seller, ...validData }` would let the body win.
    const spread = route.indexOf("...validData");
    const override = route.indexOf("seller: {", spread);
    expect(spread).toBeGreaterThan(-1);
    expect(override).toBeGreaterThan(spread);
  });

  it("builds the seller only from company columns", () => {
    const block = route.slice(route.indexOf("seller: {", route.indexOf("...validData")), route.indexOf("issueTime:"));
    expect(block).toContain("seller.name");
    expect(block).toContain("seller.vatNumber");
    // No path back to the request body inside the override.
    expect(block).not.toContain("validData.seller");
    expect(block).not.toContain("input.seller");
  });

  it("no longer requires the client to send a seller at all", () => {
    const parsed = createInvoiceSchema.safeParse({
      kind: "standard",
      issueDate: "2026-08-05",
      lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("still accepts a body carrying a seller, so existing clients do not break", () => {
    const parsed = createInvoiceSchema.safeParse({
      kind: "standard",
      issueDate: "2026-08-05",
      seller: { name: "Someone Else", vatNumber: "399999999999993" },
      lines: [{ description: "Item", quantity: 1, unitPrice: 100 }],
    });
    expect(parsed.success).toBe(true);
  });
});
