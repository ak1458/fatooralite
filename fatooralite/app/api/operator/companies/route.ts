import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";

export const runtime = "nodejs";

/**
 * GET /api/operator/companies — read-only, cross-tenant operator view.
 *
 * D7 (docs/audit/decision-register.md) — Option C: the smallest thing that
 * removes the need for support to open a live database console, without
 * building the full Customer Control Center (Option B, 23 items, XL,
 * explicitly not authorized) or introducing a platform-admin User role.
 * There is deliberately no such role in this app (see D7's own text and the
 * FeatureFlag model comment) — three IDOR fixes depend on every *role*
 * being tenant-scoped. This route sidesteps that entirely by reusing the
 * same OPERATOR_SECRET bearer-credential pattern W6's global RAG re-index
 * already established (app/api/ai/ingest/route.ts): an operator credential,
 * not a tenant session, fail-closed when unset.
 *
 * Read-only by construction — there is no POST/PATCH here and none should
 * be added; a write path is exactly the cross-tenant privileged surface D7
 * did NOT authorize. Every read is recorded via SecurityEvent (both the
 * success case and a denied attempt), per D7's explicit "audited privileged
 * reads" requirement.
 *
 * Fields deliberately returned, matching D7's scope exactly — license
 * state, last-seen, ZATCA status — plus onboarding status (already on the
 * Company row, cheap, and exactly what support needs to answer "why can't
 * this tenant see their dashboard"). "version" (Master Audit M-069/M-118)
 * is reported as "n/a": this is a single-deployed-version web app, not a
 * versioned client — see START-HERE.md's M-098…M-123 rows, all N/A for the
 * same reason.
 */
export async function GET(req: Request) {
  const secret = process.env.OPERATOR_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    await recordSecurityEvent({
      action: SECURITY_EVENTS.operatorAccessDenied,
      outcome: "denied",
      targetType: "company",
      metadata: { route: "operator.companies" },
      request: req,
    });
    return NextResponse.json(
      { error: "This surface requires an operator credential." },
      { status: 403 },
    );
  }

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      vatNumber: true,
      onboardingStatus: true,
      subscription: {
        select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
      },
      certificates: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { kind: true, status: true, issuedAt: true, expiresAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Last-seen: the most recent SecurityEvent per company, in one query
  // rather than N+1. A company with no recorded event yet (never logged
  // in since the audit trail existed) reports null, not a guess.
  const lastEvents = await prisma.securityEvent.groupBy({
    by: ["companyId"],
    where: { companyId: { in: companies.map((c) => c.id) } },
    _max: { createdAt: true },
  });
  const lastSeenByCompany = new Map(lastEvents.map((e) => [e.companyId, e._max.createdAt]));

  const result = companies.map((c) => {
    const cert = c.certificates[0] ?? null;
    return {
      id: c.id,
      name: c.name,
      vatNumber: c.vatNumber,
      onboardingStatus: c.onboardingStatus,
      version: "n/a",
      lastSeen: lastSeenByCompany.get(c.id) ?? null,
      licenseState: c.subscription
        ? {
            plan: c.subscription.plan,
            status: c.subscription.status,
            trialEndsAt: c.subscription.trialEndsAt,
            currentPeriodEnd: c.subscription.currentPeriodEnd,
          }
        // A missing Subscription resolves to "expired" everywhere else in
        // this app (invariant, START-HERE.md) — mirror that here rather
        // than reporting an ambiguous null.
        : { plan: null, status: "expired", trialEndsAt: null, currentPeriodEnd: null },
      zatcaStatus: cert ? { kind: cert.kind, status: cert.status, issuedAt: cert.issuedAt, expiresAt: cert.expiresAt } : { kind: null, status: "no_certificate", issuedAt: null, expiresAt: null },
    };
  });

  await recordSecurityEvent({
    action: SECURITY_EVENTS.operatorCompaniesViewed,
    outcome: "success",
    targetType: "company",
    metadata: { count: result.length },
    request: req,
  });

  return NextResponse.json({ companies: result });
}
