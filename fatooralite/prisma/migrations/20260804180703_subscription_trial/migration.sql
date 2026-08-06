-- Paid-only licensing: a tenant is in a 7-day trial, on pro, or expired.
-- There is no free tier any more.

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ALTER COLUMN "plan" SET DEFAULT 'trial';

-- Data migration. Both statements below matter for correctness, not tidiness:
-- lib/billing/entitlements.ts resolves an unrecognised plan, and a company
-- with no Subscription row at all, to "expired". Without this backfill every
-- pre-existing tenant would be locked out of issuing invoices the moment this
-- deploys.

-- 1. Former free rows become trials. Nobody paid for the free tier, so a fresh
--    window is the only defensible conversion; dating it from the company's
--    creation would expire long-standing tenants instantly.
UPDATE "Subscription"
SET "plan" = 'trial',
    "trialEndsAt" = COALESCE("trialEndsAt", NOW() + INTERVAL '7 days')
WHERE "plan" = 'free';

-- 2. Companies that never had a Subscription row. Under the previous code a
--    missing row was read as "free" and worked; under the new resolver it is
--    "expired" on purpose, so a deleted row cannot silently re-grant a trial.
--    Every existing company therefore needs an explicit row.
INSERT INTO "Subscription" ("id", "companyId", "plan", "status", "trialEndsAt")
SELECT gen_random_uuid()::text, c."id", 'trial', 'active', NOW() + INTERVAL '7 days'
FROM "Company" c
WHERE NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."companyId" = c."id");
