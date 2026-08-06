import { NextResponse } from "next/server";
import { zodErrorResponse } from "@/lib/validation/http";
import { prisma } from "@/lib/db/client";
import { updateCompanySchema, patchCompanySchema, checkOnboardingCompletion } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
import { checkBranchLimit, checkInvoiceLimit, checkSeatLimit, getTenantPlan } from "@/lib/billing/plan";

export const runtime = "nodejs";

/** PATCH /api/companies/[id] — partial update (profile fields + onboarding progress). */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // The wizard is the only intended path to onboardingStatus: "complete", and
  // it gates every step client-side — but this route is the actual trust
  // boundary. Without this check, any direct call (bypassing the wizard UI
  // entirely) could mark a company "complete" with none of the ZATCA-mandatory
  // fields ever filled in, which is exactly the compliance gap the wizard
  // exists to close. Branch count (>=1) is enforced client-side only for now;
  // not re-checked here.
  if (parsed.data.onboardingStatus === "complete") {
    const existing = await prisma.company.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const check = checkOnboardingCompletion(existing, parsed.data);
    if (!check.ok) {
      return NextResponse.json(
        { error: `Cannot complete onboarding — missing or invalid: ${check.path} (${check.message})` },
        { status: 422 },
      );
    }
  }
  // (checkOnboardingCompletion itself is a no-op unless parsed.data.onboardingStatus
  // === "complete" — the `if` above is just an optimization to skip the extra
  // DB read on every ordinary patch, not a correctness requirement.)

  const company = await prisma.company.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(company);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  const company = await prisma.company.findUnique({
    where: { id: params.id },
  });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sub = await prisma.subscription.findUnique({ where: { companyId: params.id } });
  // Single source of truth for "what plan is this company actually on right
  // now" — the same resolution every enforcement gate uses (trial expiry and
  // currentPeriodEnd included), so this display can never disagree with what
  // is enforced.
  const tenantPlan = await getTenantPlan(params.id);

  // Whether this tenant holds a real ZATCA-issued production CSID, as opposed
  // to a local self-signed certificate. The shell renders a "Production
  // Connected" pill from this; it used to be hardcoded and therefore claimed a
  // gateway connection for every tenant, onboarded or not.
  const productionCsid = await prisma.certificate.findFirst({
    where: { companyId: params.id, kind: "production", status: "active" },
    select: { id: true },
  });

  // Usage against every limit, for the Settings > Billing display.
  const [invoices, branches, seats] = await Promise.all([
    checkInvoiceLimit(params.id),
    checkBranchLimit(params.id),
    checkSeatLimit(params.id),
  ]);

  return NextResponse.json({
    ...company,
    subscription: sub ?? { plan: tenantPlan.plan, status: "expired", trialEndsAt: null },
    zatcaConnected: Boolean(productionCsid),
    plan: tenantPlan.plan,
    trialDaysLeft: tenantPlan.trialDaysLeft,
    trialEndsAt: tenantPlan.trialEndsAt,
    currentPeriodEnd: tenantPlan.currentPeriodEnd,
    planLimits: tenantPlan.limits,
    invoiceUsage: { used: invoices.used, limit: invoices.limit },
    branchUsage: { used: branches.used, limit: branches.limit },
    seatUsage: { used: seats.used, limit: seats.limit },
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny } = await requirePermission(req, "settings:manage", params.id);
  if (deny) return deny;

  try {
    const body = await req.json();
    const data = updateCompanySchema.parse(body);
    
    const company = await prisma.company.update({
      where: { id: params.id },
      data,
    });
    
    return NextResponse.json(company);
  } catch (error) {
    const invalid = zodErrorResponse(error);
    if (invalid) return invalid;
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
