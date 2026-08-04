import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { updateCompanySchema, patchCompanySchema, checkOnboardingCompletion } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
import { PLAN_LIMITS, checkInvoiceLimit, getEffectivePlan } from "@/lib/billing/plan";

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
  // Single source of truth for "is this company actually Pro right now" —
  // matches checkInvoiceLimit's own resolution (currentPeriodEnd expiry
  // included), so this display can never disagree with what's enforced.
  const isPro = (await getEffectivePlan(params.id)) === "pro";

  // Monthly invoice usage — needed by the Settings > Billing usage display.
  const { used, limit } = await checkInvoiceLimit(params.id);

  return NextResponse.json({
    ...company,
    subscription: sub ?? { plan: "free", status: "active" },
    planLimits: PLAN_LIMITS[isPro ? "pro" : "free"],
    invoiceUsage: { used, limit },
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
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
