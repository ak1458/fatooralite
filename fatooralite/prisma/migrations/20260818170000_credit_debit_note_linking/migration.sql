-- Credit/debit note linking (Phase 3 / N8).
--
-- lib/zatca/types.ts's InvoiceInput has carried billingReferenceId and
-- instructionNote since before this migration -- they flow into the signed
-- XML's BillingReference/Note elements -- but were never persisted on the
-- Invoice row itself, so "which invoice does this credit note correct" was
-- only answerable by parsing XML text. All three columns are nullable and
-- additive; every existing row is an ordinary invoice with no correction
-- link, which is exactly what NULL means here.

ALTER TABLE "Invoice" ADD COLUMN "billingReferenceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "instructionNote" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "referencedInvoiceId" TEXT;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_referencedInvoiceId_fkey"
  FOREIGN KEY ("referencedInvoiceId") REFERENCES "Invoice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Invoice_referencedInvoiceId_idx" ON "Invoice"("referencedInvoiceId");
