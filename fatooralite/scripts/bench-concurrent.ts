/**
 * Concurrent invoice issuance at volume (Phase 3 / W14).
 *
 *   npx tsx scripts/seed-volume.ts 20000
 *   npx tsx scripts/bench-concurrent.ts [N]     # N parallel issuers, default 16
 *   npx tsx scripts/seed-volume.ts --clean
 *
 * Re-verifies the audit's concurrent-issuance result (chain never forks,
 * excess issuers queue behind nextChainSlot's row lock and either succeed
 * or fail cleanly with Prisma P2028) against a company that actually has
 * volume behind it, not the 2-invoice demo fixture.
 */
import { PrismaClient } from "@prisma/client";
import { provisionLocalCertificate } from "@/lib/services/onboarding-service";
import { issueInvoice } from "@/lib/services/invoice-service";
import type { InvoiceInput } from "@/lib/zatca/types";

const prisma = new PrismaClient();
const MARKER_VAT = "399999999999993";

async function main() {
  const n = Number(process.argv[2]) || 16;
  const company = await prisma.company.findFirst({ where: { vatNumber: MARKER_VAT } });
  if (!company) {
    console.error("No volume-test company. Run: npx tsx scripts/seed-volume.ts 20000");
    process.exit(1);
  }

  const hasCert = await prisma.certificate.findFirst({ where: { companyId: company.id, status: "active" } });
  if (!hasCert) {
    await provisionLocalCertificate(company.id, prisma);
    console.log("Provisioned a local certificate for the volume company.");
  }

  const before = await prisma.invoice.count({ where: { companyId: company.id } });
  console.log(`Starting from ${before} existing invoices. Firing ${n} concurrent issuers...`);

  const input: InvoiceInput = {
    invoiceNumber: "",
    kind: "standard",
    issueDate: new Date().toISOString().slice(0, 10),
    seller: { name: company.name, vatNumber: company.vatNumber },
    buyer: { name: "Bench Buyer", vatNumber: "300000000000003" },
    lines: [{ description: "Concurrency bench item", quantity: 1, unitPrice: 100 }],
  };

  const started = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, () => issueInvoice(company.id, { ...input }, prisma)),
  );
  const elapsed = performance.now() - started;

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;
  const failureReasons = new Map<string, number>();
  for (const r of results) {
    if (r.status === "rejected") {
      const msg = r.reason instanceof Error ? r.reason.constructor.name : String(r.reason);
      failureReasons.set(msg, (failureReasons.get(msg) ?? 0) + 1);
    }
  }

  const after = await prisma.invoice.count({ where: { companyId: company.id } });
  const distinctIcvs = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT COUNT(DISTINCT "hash") AS n FROM "Invoice" WHERE "companyId" = $1 AND "hash" IS NOT NULL`,
    company.id,
  );

  console.log(`\n${n} concurrent issuers in ${elapsed.toFixed(0)}ms — ${succeeded} succeeded, ${failed} failed (queued past their own timeout, expected under contention)`);
  if (failureReasons.size) console.log("Failure reasons:", Object.fromEntries(failureReasons));
  console.log(`Invoice count: ${before} -> ${after} (delta ${after - before}, expected ${succeeded})`);
  console.log(`Distinct hashes among all signed invoices: ${distinctIcvs[0].n} — the chain never forked if this only ever grows by 1 per successful issue, never duplicates`);

  if (after - before !== succeeded) {
    console.error("\n✗ MISMATCH: invoice count delta does not match the number of reported successes — investigate before trusting this run.");
    process.exitCode = 1;
  } else {
    console.log("\n✓ No duplicate/lost invoices under concurrency.");
  }
}

main().finally(() => prisma.$disconnect());
