import { NextResponse } from "next/server";
import { z } from "zod";
import {
  startOnboarding,
  completeOnboarding,
  hasResumableComplianceCertificate,
  OnboardingStateError,
} from "@/lib/services/onboarding-service";
import { OnboardingError } from "@/lib/zatca/onboarding";
import { requirePermission } from "@/lib/auth/server";
import type { ZatcaMode } from "@/lib/zatca/client";

export const runtime = "nodejs";

const activateSchema = z.object({
  companyId: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  mode: z.enum(["sandbox", "production"]).optional(),
});

/**
 * POST /api/onboarding/activate — single round-trip orchestration of the
 * ZATCA onboarding pipeline: CCSID (step 1) -> compliance checks -> PCSID
 * (step 3). The portal OTP is single-use and ~60min-lived, so this wraps
 * startOnboarding + completeOnboarding in one server-side call instead of
 * requiring the frontend to fire two separate requests (the first of which
 * would consume the OTP before the second even starts).
 *
 * Resume semantics: if a usable compliance certificate already exists (a
 * prior attempt got the CCSID but failed at the compliance-checks or PCSID
 * step), step 1 is skipped so a retry doesn't burn a fresh OTP for nothing.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ step: "ccsid", error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { step: "ccsid", error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { companyId, otp, mode: bodyMode } = parsed.data;
  const mode = bodyMode ?? (process.env.ZATCA_MODE as ZatcaMode | undefined);

  // Must be scoped to companyId — without it, any user with settings:manage
  // on their own tenant could onboard/operate on a DIFFERENT company's ZATCA
  // certificates just by putting that company's id in the request body. See
  // app/api/onboarding/start/route.ts and .../complete/route.ts.
  const { deny } = await requirePermission(req, "settings:manage", companyId);
  if (deny) return deny;

  const canResume = await hasResumableComplianceCertificate(companyId);
  if (!canResume) {
    try {
      await startOnboarding({
        companyId,
        otp,
        commonName: "FatooraLite-Pro-EGS",
        organizationalUnit: "Main",
        mode,
      });
    } catch (err) {
      // Never surface the raw gateway response here — an OTP rejection can
      // echo request context back, so only the safe .message crosses the wire.
      if (err instanceof OnboardingStateError) {
        return NextResponse.json({ step: "ccsid", error: err.message }, { status: 404 });
      }
      if (err instanceof OnboardingError) {
        return NextResponse.json({ step: "ccsid", error: err.message }, { status: 422 });
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ step: "ccsid", error: message }, { status: 500 });
    }
  }

  try {
    const result = await completeOnboarding(companyId, mode);
    return NextResponse.json({ step: "done", ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof OnboardingStateError) {
      return NextResponse.json({ step: "compliance", error: err.message }, { status: 409 });
    }
    if (err instanceof OnboardingError) {
      return NextResponse.json({ step: "compliance", error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ step: "compliance", error: message }, { status: 500 });
  }
}
