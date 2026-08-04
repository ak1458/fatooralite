import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyWebhookSecret, parseInvoiceWebhook } from "@/lib/billing/moyasar";
import { PRO_PERIOD_DAYS } from "@/lib/billing/plan";

export const runtime = "nodejs";

/**
 * POST /api/billing/webhook — Moyasar's server-to-server notification when
 * an invoice reaches a final state. Public by design (Moyasar calls this
 * directly, no session cookie) — trust comes entirely from
 * verifyWebhookSecret, not network origin. Must fail closed on anything
 * unverified or unparseable: silently 200-ing a malformed payload would
 * make Moyasar stop retrying a real event we failed to understand.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!verifyWebhookSecret(payload)) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const event = parseInvoiceWebhook(payload);
  if (!event) {
    return NextResponse.json({ error: "Unrecognized payload shape" }, { status: 400 });
  }
  if (!event.companyId) {
    console.error("Moyasar webhook: invoice has no companyId in metadata:", event.invoiceId);
    return NextResponse.json({ error: "Missing companyId metadata" }, { status: 400 });
  }

  // Only a genuinely paid invoice unlocks Pro. Acknowledge everything else
  // (failed/expired/canceled) without acting on it.
  if (event.status !== "paid") {
    return NextResponse.json({ received: true, status: event.status });
  }

  const sub = await prisma.subscription.findUnique({ where: { companyId: event.companyId } });
  // Idempotent: Moyasar may retry a delivered webhook. Only skip if THIS
  // exact invoice already credited the account — a later invoice (renewal)
  // still extends the period below, same pattern as AlreadySubmittedError
  // for ZATCA submission retries.
  if (sub?.processorSubscriptionId === event.invoiceId && sub.status === "active" && sub.plan === "pro") {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const currentPeriodEnd = new Date(Date.now() + PRO_PERIOD_DAYS * 86_400_000);
  await prisma.subscription.upsert({
    where: { companyId: event.companyId },
    create: {
      companyId: event.companyId,
      plan: "pro",
      status: "active",
      processorSubscriptionId: event.invoiceId,
      currentPeriodEnd,
    },
    update: { plan: "pro", status: "active", processorSubscriptionId: event.invoiceId, currentPeriodEnd },
  });

  return NextResponse.json({ received: true });
}
