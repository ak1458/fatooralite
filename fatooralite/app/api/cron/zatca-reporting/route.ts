import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { submitInvoice, AlreadySubmittedError, SubmissionInFlightError } from "@/lib/services/clearance-service";

export const runtime = "nodejs";
// Vercel execution ceiling (Hobby 10s / Pro 60s / Enterprise ≤300s). The loop
// below self-terminates before this so a hard kill never strands a row mid-write.
export const maxDuration = 60;

const BATCH_SIZE = 25;
const TIME_BUDGET_MS = 50_000; // stop well before maxDuration
const CONCURRENCY = 5;         // don't hammer the gateway from one invocation

/**
 * ZATCA mechanics: reporting is asynchronous. A B2C simplified invoice must
 * reach ZATCA within 24h of issuance, but checkout must NOT block on the
 * gateway. Issuance signs + stores locally with reportingState="pending"; this
 * cron drains the backlog, oldest-deadline-first. Runs every 15 minutes.
 */
export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Fail CLOSED: an
  // unset CRON_SECRET must deny, not skip, the check — this path is public
  // (the route itself is committed in vercel.json) and drives real ZATCA
  // gateway submissions, so "misconfigured" must not mean "wide open." Env
  // validation already requires CRON_SECRET in production (lib/env.ts), but
  // that's a boot-time guard on NODE_ENV — this is the actual request-time
  // trust boundary and must not depend on that check having run correctly.
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let reported = 0;
  let failed = 0;
  let processed = 0;

  const now = new Date();
  const due = await prisma.invoice.findMany({
    where: {
      kind: "simplified", // B2C
      reportingState: "pending",
      signedXml: { not: null },
      // W3: honor the retry ceiling and backoff schedule — a row that has
      // exhausted its attempts (needsReview) or is still cooling down
      // (nextSubmitAt in the future) must not be retried every tick.
      needsReview: false,
      OR: [{ nextSubmitAt: null }, { nextSubmitAt: { lte: now } }],
    },
    orderBy: { reportingDeadline: "asc" }, // closest to breaching 24h first
    take: BATCH_SIZE,
    select: { id: true },
  });

  const queue = [...due];
  async function worker() {
    while (queue.length && Date.now() - started < TIME_BUDGET_MS) {
      const inv = queue.shift();
      if (!inv) break;
      processed++;
      try {
        const res = await submitInvoice(inv.id); // reports simplified + persists gateway record
        const ok = res.response.status === "accepted";
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { reportingState: ok ? "reported" : "failed" },
        });
        if (ok) {
          reported++;
        } else {
          failed++;
        }
      } catch (err) {
        if (err instanceof AlreadySubmittedError) {
          // Already reported by a concurrent run or a manual clear in the
          // UI — clear it from the pending queue instead of retrying
          // forever (submitInvoice's guard would throw this every tick).
          await prisma.invoice.update({ where: { id: inv.id }, data: { reportingState: "reported" } });
          reported++;
        } else if (err instanceof SubmissionInFlightError) {
          // Another claim (a concurrent tick, or the reconcile cron) already
          // owns this invoice's retry — not a failure, just not ours to
          // resolve on this tick. Leave PENDING; the reconciler's own backoff
          // governs when it's touched again.
        } else {
          // Transient error (gateway/network): leave PENDING so the next tick retries.
          failed++;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return NextResponse.json({
    processed,
    reported,
    failed,
    remaining: queue.length, // >0 means the next 15-min tick continues draining
    elapsedMs: Date.now() - started,
  });
}
