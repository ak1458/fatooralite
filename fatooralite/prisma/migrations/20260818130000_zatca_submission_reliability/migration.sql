-- ZATCA submission reliability (Phase 2 / W3).
--
-- The gateway has no status-lookup endpoint, so a stranded "submitted" row
-- can only be resubmitted (identical uuid+hash, unchanged) or flagged for a
-- human once a retry ceiling is hit — never guessed as accepted or rejected.
-- All four columns default to values that are correct for existing rows: a
-- pre-migration invoice has made 0 tracked attempts and is not flagged.

ALTER TABLE "Invoice" ADD COLUMN "submitAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "lastSubmitAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "nextSubmitAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- Reconciler's due-query: invoices stuck in "submitted", oldest attempt first.
CREATE INDEX "Invoice_status_needsReview_lastSubmitAt_idx" ON "Invoice"("status", "needsReview", "lastSubmitAt");
