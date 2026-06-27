import { NextResponse } from "next/server";
import { provisionLocalCertificate, OnboardingStateError } from "@/lib/services/onboarding-service";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

/**
 * POST /api/onboarding/local-cert — provision a local signing certificate so the
 * company can issue invoices immediately (sandbox/local). Idempotent.
 */
export async function POST(req: Request) {
  let body: { companyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { deny } = await requirePermission(req, "settings:manage", body.companyId);
  if (deny) return deny;

  try {
    const result = await provisionLocalCertificate(body.companyId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingStateError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("local-cert error:", err);
    return NextResponse.json({ error: "Could not provision certificate" }, { status: 500 });
  }
}
