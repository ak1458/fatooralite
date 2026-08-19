import { NextResponse } from "next/server";
import { getInvoice, getCompany } from "@/lib/db/repo";
import { requirePermission } from "@/lib/auth/server";
import { generatePdf } from "@/lib/pdf/generate";
import { loggerFor } from "@/lib/log/logger";
import { prisma } from "@/lib/db/client";
import { isRateLimited } from "@/lib/ratelimit/limiter";
import { sendEmail } from "@/lib/email/send";
import { invoiceEmailSubject, invoiceEmailHtml } from "@/lib/email/templates/invoice-email";
import { recordSecurityEvent, SECURITY_EVENTS } from "@/lib/audit/events";
import { isFlagEnabled } from "@/lib/flags/flags";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/send — email the invoice PDF to its stored customer.
 *
 * N7. The recipient is never taken from the request body — it comes
 * exclusively from the invoice's linked `Customer.email`, scoped to the same
 * company as the invoice. This is the anti-abuse design: it makes the route
 * incapable of being used as a free email relay to an arbitrary address,
 * because there is no address parameter to control.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny, user } = await requirePermission(req, "invoice:export");
  if (deny) return deny;

  const invoice = await getInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Tenant isolation — same shape as the PDF route this mirrors.
  if (process.env.AUTH_ENFORCE !== "false") {
    if (!user?.companyId || user.companyId !== invoice.companyId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else if (user?.companyId && user.companyId !== invoice.companyId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!(await isFlagEnabled(invoice.companyId, "emailInvoiceDelivery"))) {
    return NextResponse.json({ error: "Email delivery is not enabled for this account" }, { status: 403 });
  }

  // A draft is not an issued legal document — emailing it to a buyer would
  // misrepresent an unfinished record as a real invoice.
  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Draft invoices cannot be emailed" }, { status: 422 });
  }

  if (!invoice.customerId) {
    return NextResponse.json({ error: "This invoice has no linked customer to email" }, { status: 422 });
  }
  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });
  if (!customer || customer.companyId !== invoice.companyId || !customer.email) {
    return NextResponse.json({ error: "The linked customer has no email address on file" }, { status: 422 });
  }

  if (await isRateLimited("invoice-email", invoice.companyId, 20, 3600)) {
    return NextResponse.json({ error: "Too many email sends for this account — try again later" }, { status: 429 });
  }

  const hasProvider = Boolean(process.env.RESEND_API_KEY);
  if (!hasProvider && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
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

    const subject = invoiceEmailSubject({
      invoiceNumber: invoice.invoiceNumber,
      sellerName: company?.name ?? "",
      grandTotal: invoice.grandTotal.toString(),
    });
    const html = invoiceEmailHtml({
      invoiceNumber: invoice.invoiceNumber,
      sellerName: company?.name ?? "",
      grandTotal: invoice.grandTotal.toString(),
    });

    const result = await sendEmail({
      to: customer.email,
      subject,
      html,
      attachments: [{ filename: `invoice_${invoice.invoiceNumber}.pdf`, content: pdfBytes }],
    });

    await recordSecurityEvent({
      action: SECURITY_EVENTS.invoiceEmailSent,
      outcome: result.sent ? "success" : "failure",
      companyId: invoice.companyId,
      actorId: user?.userId ?? null,
      actorEmail: user?.email ?? null,
      targetType: "invoice",
      targetId: invoice.id,
      metadata: { to: customer.email },
      request: req,
    });

    // Never claim a mock (no RESEND_API_KEY) or an actual send failure as a
    // real delivery — the caller must be able to tell "logged, not sent"
    // apart from "sent".
    if (!result.sent && hasProvider) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
    }
    return NextResponse.json({ sent: result.sent, delivery: hasProvider ? "live" : "mock" });
  } catch (error) {
    loggerFor(req).error("invoice.email.failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to send invoice email" }, { status: 500 });
  }
}
