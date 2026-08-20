-- Server-minted, single-use AI write-confirmation tokens (Phase 2 / W5).
--
-- No foreign keys on userId/companyId: same rationale as SecurityEvent — a
-- confirmation record's audit value must not depend on the row it references
-- still existing.

CREATE TABLE "AiConfirmation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "argsJson" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiConfirmation_tokenHash_key" ON "AiConfirmation"("tokenHash");

-- Opportunistic cleanup of expired rows on mint.
CREATE INDEX "AiConfirmation_expiresAt_idx" ON "AiConfirmation"("expiresAt");
