import { NextResponse } from "next/server";
import { startOnboarding, OnboardingStateError } from "@/lib/services/onboarding-service";
import { OnboardingError } from "@/lib/zatca/onboarding";
import { requirePermission } from "@/lib/auth/server";
import type { ZatcaMode } from "@/lib/zatca/client";

export const runtime = "nodejs";

/** POST /api/onboarding/start — generate CSR + get a Compliance CSID. */
export async function POST(req: Request) {
  const { deny } = await requirePermission(req, "settings:manage");
  if (deny) return deny;

  let body: {
    companyId?: string;
    otp?: string;
    commonName?: string;
    organizationalUnit?: string;
    mode?: ZatcaMode;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { companyId, otp, commonName, organizationalUnit, mode } = body;
  if (!companyId || !otp || !commonName || !organizationalUnit) {
    return NextResponse.json(
      { error: "companyId, otp, commonName and organizationalUnit are required" },
      { status: 400 },
    );
  }

  try {
    const result = await startOnboarding({ companyId, otp, commonName, organizationalUnit, mode }, );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingStateError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof OnboardingError) {
      return NextResponse.json({ error: err.message, raw: err.raw }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
