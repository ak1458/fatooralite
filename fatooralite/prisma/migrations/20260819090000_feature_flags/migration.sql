-- Per-tenant feature flags (Phase 5 / N6).
--
-- Not a security boundary (A-220) -- every route consulting a flag runs
-- requirePermission/requireFeature first, independently. No HTTP write path
-- exists on purpose: there is deliberately no platform-admin role in this
-- app (D7, docs/audit/decision-register.md), so rows are written only via
-- scripts/set-flag.ts (an operator with database access), never over HTTP.
-- FK+cascade is fine here (unlike SecurityEvent) because the audit record of
-- a flag change lives in SecurityEvent, which survives independently.

CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_companyId_flag_key" ON "FeatureFlag"("companyId", "flag");

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
