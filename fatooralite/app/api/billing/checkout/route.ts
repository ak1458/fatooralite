import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { isMoyasarConfigured, createCheckoutInvoice } from "@/lib/billing/moyasar";
import { PRO_PRICE_HALALAS, PRO_PERIOD_DAYS } from "@/lib/billing/plan";

export const runtime = "nodejs";

/** POST /api/billing/checkout — start a Moyasar hosted checkout for the Pro plan. Returns { url } to redirect the browser to. */
export async function POST(req: Request) {
  let body: { companyId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId } = body;
  if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

  const { deny } = await requirePermission(req, "settings:manage", companyId);
  if (deny) return deny;

  if (!isMoyasarConfigured()) {
    return NextResponse.json(
      { error: "Payments are not yet enabled on this deployment. Contact support to upgrade." },
      { status: 501 },
    );
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "Server misconfigured: APP_URL is not set." }, { status: 500 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  try {
    const invoice = await createCheckoutInvoice({
      amountHalalas: PRO_PRICE_HALALAS,
      description: `Fatoora Lite Pro — Pro plan, ${PRO_PERIOD_DAYS} days (${company.name})`,
      successUrl: `${appUrl}/settings?billing=success`,
      callbackUrl: `${appUrl}/api/billing/webhook`,
      metadata: { companyId },
    });

    // Record which invoice this company is paying, so the webhook has
    // something to match against. Status is deliberately NOT flipped to
    // "active"/"pro" here — only a verified webhook (lib/billing/moyasar.ts's
    // verifyWebhookSecret) grants Pro. The browser landing on success_url
    // proves nothing by itself (a user could navigate there without paying).
    await prisma.subscription.upsert({
      where: { companyId },
      create: { companyId, plan: "free", status: "active", processorSubscriptionId: invoice.id },
      update: { processorSubscriptionId: invoice.id },
    });

    return NextResponse.json({ url: invoice.url });
  } catch (e) {
    console.error("Moyasar checkout creation failed:", e);
    return NextResponse.json({ error: "Could not start checkout. Try again shortly." }, { status: 502 });
  }
}
