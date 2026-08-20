-- Database CHECK constraints (Phase 3 / W11).
--
-- Every rule here already exists in application code (BR-KSA checks in
-- lib/zatca/validate.ts, zod schemas in lib/validation/schemas.ts, or the
-- state machine invariants in lib/services/clearance-service.ts) — nothing
-- new is invented. Each vocabulary was verified against every actual write
-- site in the codebase (not just the schema.prisma comment, which was found
-- stale for Certificate.status — see below), and against existing data on
-- both fatoora_audit and neondb (read-only check) before this migration was
-- written. See the Phase 3 handoff entry for the exact values found.
--
-- Deliberately NOT constrained: Subscription.status. lib/billing/
-- entitlements.test.ts proves the resolver treats it as an open string by
-- design — it.each(["past_due","canceled","incomplete",""]) all resolve
-- safely to "expired", modelling third-party payment-provider vocabulary
-- (Stripe/Moyasar-style) the app must tolerate without knowing every value
-- in advance. A CHECK constraint here would fight that design, not protect
-- it, so it is intentionally omitted.

-- InvoiceLine: mirrors BR-KSA-21/22 (lib/zatca/validate.ts) and the zod
-- bounds in lib/validation/schemas.ts.
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "line_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "line_unitprice_nonneg" CHECK ("unitPrice" >= 0);
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "line_vatrate_bounds" CHECK ("vatRate" >= 0 AND "vatRate" <= 1);

-- Invoice: status/kind/documentType/reportingState are free `String` columns
-- in Prisma (kept as strings, not a native enum, to avoid an enum migration
-- every time a lifecycle value is added) but only ever hold one of a fixed,
-- internally-controlled vocabulary (unlike Subscription.status, none of
-- these come from an external webhook) in every write path in the app.
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_status_valid"
  CHECK ("status" IN ('draft','signed','submitted','cleared','reported','rejected'));
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_kind_valid" CHECK ("kind" IN ('standard','simplified'));
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_doctype_valid" CHECK ("documentType" IN ('invoice','credit','debit'));
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_repstate_valid"
  CHECK ("reportingState" IN ('n/a','pending','reported','failed'));
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_attempts_nonneg" CHECK ("submitAttempts" >= 0);
-- Financial coherence: the DB-persisted total must agree with the taxable+VAT
-- split within the app's own 2dp rounding grain (see money.ts).
ALTER TABLE "Invoice" ADD CONSTRAINT "invoice_total_coheres"
  CHECK (ABS("grandTotal" - ("taxableAmount" + "vatAmount")) <= 0.01);

-- Subscription.plan: verified against every write site (lib/billing/plan.ts,
-- app/api/billing/webhook/route.ts) and the resolver's own strict `=== "pro"`
-- / `=== "trial"` comparisons — unlike status, there is no evidence this is
-- meant to tolerate a third value.
ALTER TABLE "Subscription" ADD CONSTRAINT "sub_plan_valid" CHECK ("plan" IN ('trial','pro'));

-- Certificate.kind: verified against all three certificate.create() call
-- sites in lib/services/onboarding-service.ts.
ALTER TABLE "Certificate" ADD CONSTRAINT "cert_kind_valid" CHECK ("kind" IN ('compliance','production','local'));
-- Certificate.status: schema.prisma's own comment ("pending|compliance|
-- active|expired|failed") was stale — grep found a real write of "used"
-- (onboarding-service.ts:323, marking a compliance cert consumed once its
-- production CSID is issued) that the comment never documented. Included
-- here; "pending" (the column's own @default) and "failed" are kept even
-- though no current code path writes them explicitly, since they are the
-- declared default and a plausible future failure state respectively —
-- excluding either would make the column's own default value invalid.
ALTER TABLE "Certificate" ADD CONSTRAINT "cert_status_valid"
  CHECK ("status" IN ('pending','compliance','active','expired','failed','used'));
