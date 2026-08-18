import { NextResponse } from "next/server";
import { reconcileStuckSubmissions } from "@/lib/services/reconcile-service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ZATCA submission reconciliation. Complements the reporting cron: that one
 * drains the B2C 24h queue; this one finds ANY invoice (B2C or B2B) stranded
 * in "submitted" — a crash, a Vercel function timeout, or a killed process
 * that left the gateway's fate unrecorded — and either resends the identical
 * signed payload or flags it for manual review past the retry ceiling.
 * Runs daily at 04:00, an hour after the reporting cron, so the two never
 * touch overlapping rows in the same tick.
 */
export async function GET(req: Request) {
  // Same fail-closed bearer check as /api/cron/zatca-reporting: an unset
  // CRON_SECRET must deny, not skip. This route resends live invoices to the
  // ZATCA gateway, so "misconfigured" must not mean "wide open."
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await reconcileStuckSubmissions();
  return NextResponse.json(result);
}
