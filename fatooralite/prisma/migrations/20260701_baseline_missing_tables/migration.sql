-- Baseline repair: Customer, Product, Notification, and KnowledgeChunk were
-- created against the real database via `prisma db push` at some point after
-- `0_init` (before this repair, migration history never `CREATE TABLE`d them
-- — later migrations only `ALTER`/index/FK them, which assumes they already
-- exist). That gap breaks `prisma migrate dev`/`migrate diff` for everyone,
-- since Prisma replays the full migration history into a scratch shadow
-- database to compute diffs, and the replay fails with P1014 the moment a
-- later migration references one of these tables.
--
-- This migration is a no-op against any database that already has these
-- tables (real dev/prod) — it exists to bring them into being in the
-- *shadow* database (and any fresh database built purely from migration
-- history) so replay succeeds. Column shapes below are the pre-hardening
-- shapes (Float unitPrice, Float[] embedding) on purpose: they must match
-- what `20260703_production_hardening`, which runs immediately after this
-- one, expects to ALTER FROM (Decimal(14,2) conversion; Float[] -> vector
-- conversion). It intentionally does NOT add the indexes or foreign keys for
-- these tables — 20260703 already creates every one of those; duplicating
-- them here would collide.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "vatNumber" TEXT,
    "crNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sku" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "vatCategory" TEXT NOT NULL DEFAULT 'S',
    "unitCode" TEXT NOT NULL DEFAULT 'PCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable (embedding starts as a plain Float[] — 20260703 converts it to
-- pgvector's "vector" type via cardinality()/translate(), so it must still
-- be an array here or that conversion's USING clause breaks on replay).
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "companyId" TEXT,
    "source" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (the one index on these four tables that no later migration adds)
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_scope_companyId_idx" ON "KnowledgeChunk"("scope", "companyId");

-- AddForeignKey (original RESTRICT/CASCADE shape, matching how 0_init wired
-- Branch/Certificate/Invoice/User at the same point in history —
-- 20260703_production_hardening DROPs and re-ADDs these as CASCADE/CASCADE
-- right after this migration, same as it does for those other tables).
DO $$ BEGIN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Same class of drift, different columns: these were also added to the real
-- database via `db push` with no corresponding migration. None of them are
-- referenced by any later migration, so placement here (right after
-- 0_init) is safe.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "onboardingStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetNonce" TEXT;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
