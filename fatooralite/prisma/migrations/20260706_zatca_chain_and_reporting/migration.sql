-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "reportingDeadline" TIMESTAMP(3),
ADD COLUMN     "reportingState" TEXT NOT NULL DEFAULT 'n/a';

-- AlterTable
ALTER TABLE "InvoiceCounter" ADD COLUMN     "lastHash" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_kind_reportingState_reportingDeadline_idx" ON "Invoice"("kind", "reportingState", "reportingDeadline");

