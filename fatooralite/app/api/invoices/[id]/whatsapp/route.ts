import { NextResponse } from "next/server";
import { getInvoice, getCompany } from "@/lib/db/repo";
import { requirePermission } from "@/lib/auth/server";
import { generatePdf } from "@/lib/pdf/generate";
import { loggerFor } from "@/lib/log/logger";
import { prisma } from "@/lib/db/client";
import { isRateLimited } from "@/lib/ratelimit/limiter";
import { sendWhatsAppInvoice } from "@/lib/whatsapp/send";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { isFlagEnabled } from "@/lib/flags/flags";

export const runtime = "nodejs";

const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * POST /api/invoices/:id/whatsapp — send the invoice PDF to its stored
 * customer over WhatsApp (D8/N3, docs/audit/decision-register.md — WhatsApp
 * IS required for launch per the owner's decision).
 *
 * Mirrors POST /api/invoices/:id/send (N7, email) exactly on the one design
 * decision that matters most: the recipient is never taken from the request
 * body — it comes exclusively from the invoice's linked `Customer.phone`,
 * scoped to the same company as the invoice. Same anti-abuse reasoning as
 * email: there is no address parameter to control, so this cannot be used
 * to relay an arbitrary outbound WhatsApp message to an attacker-chosen
 * number.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny, user } = await requirePermission(req, "invoice:export");
  if (deny) return deny;

  const invoice = await getInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.AUTH_ENFORCE !== "false") {
    if (!user?.companyId || user.companyId !== invoice.companyId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else if (user?.companyId && user.companyId !== invoice.companyId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!(await isFlagEnabled(invoice.companyId, "whatsappInvoiceDelivery"))) {
    return NextResponse.json({ error: "WhatsApp delivery is not enabled for this account" }, { status: 403 });
  }

  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Draft invoices cannot be sent" }, { status: 422 });
  }

  if (!invoice.customerId) {
    return NextResponse.json({ error: "This invoice has no linked customer to message" }, { status: 422 });
  }
  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });
  if (!customer || customer.companyId !== invoice.companyId || !customer.phone) {
    return NextResponse.json({ error: "The linked customer has no phone number on file" }, { status: 422 });
  }
  if (!PHONE_RE.test(customer.phone)) {
    return NextResponse.json({ error: "The linked customer's phone number is not in a valid WhatsApp-capable format" }, { status: 422 });
  }

  if (await isRateLimited("invoice-whatsapp", invoice.companyId, 20, 3600)) {
    return NextResponse.json({ error: "Too many WhatsApp sends for this account — try again later" }, { status: 429 });
  }

  const hasProvider = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  if (!hasProvider && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "WhatsApp delivery is not configured" }, { status: 503 });
  }

  try {
    const company = await getCompany(invoice.companyId);
    const pdfBytes = await generatePdf(invoice, {
      xml: invoice.xml || undefined,
      lines: invoice.lines,
      seller: company
        ? { name: company.name, nameAr: company.nameAr, vatNumber: company.vatNumber, address: company.address }
        : undefined,
    });

    const result = await sendWhatsAppInvoice({
      to: customer.phone,
      invoiceNumber: invoice.invoiceNumber,
      sellerName: company?.name ?? "",
      grandTotal: invoice.grandTotal.toString(),
      pdfBytes,
      filename: `invoice_${invoice.invoiceNumber}.pdf`,
    });

    await recordSecurityEvent({
      action: SECURITY_EVENTS.invoiceWhatsappSent,
      outcome: result.sent ? "success" : "failure",
      companyId: invoice.companyId,
      actorId: user?.userId ?? null,
      actorEmail: user?.email ?? null,
      targetType: "invoice",
      targetId: invoice.id,
      metadata: { to: customer.phone },
      request: req,
    });

    // Same rule as email: never claim a mock (no credentials) or an actual
    // send failure as a real delivery.
    if (!result.sent && hasProvider) {
      return NextResponse.json({ error: "Failed to send WhatsApp message" }, { status: 502 });
    }
    return NextResponse.json({ sent: result.sent, delivery: hasProvider ? "live" : "mock" });
  } catch (error) {
    loggerFor(req).error("invoice.whatsapp.failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to send invoice via WhatsApp" }, { status: 500 });
  }
}
