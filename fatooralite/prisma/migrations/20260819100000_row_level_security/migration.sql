-- D6 (docs/audit/decision-register.md) — Option C: Postgres row-level
-- security as defence in depth beneath the application's own companyId
-- scoping, for the four highest-value tenant-scoped tables (Invoice,
-- Customer, Product, Certificate). Today one missed `where companyId` in
-- one new route is a cross-tenant leak; RLS makes the database refuse it
-- regardless of what application code does or forgets.
--
-- This does NOT touch the connection the application already uses for
-- every existing query (the migration/owner role). RLS never restricts a
-- table's owner unless FORCE ROW LEVEL SECURITY is also set, and this
-- migration deliberately does not set it — forcing RLS onto the owner role
-- that 100% of this application's existing code (and this whole test
-- suite) already connects as would make every unmigrated query path
-- return zero rows the instant this migration lands, which is exactly the
-- "changes every query path, real regression risk" the decision register
-- warned about. Instead, a new NOLOGIN role is created; RLS applies to it
-- automatically as a non-owner role. Only code that deliberately opts in
-- via `SET LOCAL ROLE fatoora_rls_app` (see lib/db/rls-client.ts) is
-- affected. See that file's header for what is, and is not, wired up to
-- it yet, and lib/db/rls.test.ts for the adversarial proof.
--
-- Idempotent by construction (DROP ... IF EXISTS / exception-guarded
-- CREATE ROLE) because `prisma db push --force-reset` — which every
-- schema-pushing test file's beforeAll may call — drops and recreates the
-- whole public schema from schema.prisma alone, silently wiping table-level
-- RLS state and policies along with it every time (the same reason W11's
-- CHECK constraints self-reapply in lib/db/check-constraints.test.ts rather
-- than being trusted to persist). The role itself is cluster-level, not
-- schema-level, so it survives a `db push --force-reset` — but the
-- exception guard costs nothing and protects a fresh database too.

DO $$
BEGIN
  CREATE ROLE fatoora_rls_app NOLOGIN;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

DO $$
BEGIN
  GRANT fatoora_rls_app TO CURRENT_USER;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

GRANT USAGE ON SCHEMA public TO fatoora_rls_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Invoice", "Customer", "Product", "Certificate" TO fatoora_rls_app;

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Invoice";
CREATE POLICY tenant_isolation ON "Invoice"
  USING ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Customer";
CREATE POLICY tenant_isolation ON "Customer"
  USING ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Product";
CREATE POLICY tenant_isolation ON "Product"
  USING ("companyId" = current_setting('app.company_id', true));

ALTER TABLE "Certificate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Certificate";
CREATE POLICY tenant_isolation ON "Certificate"
  USING ("companyId" = current_setting('app.company_id', true));
