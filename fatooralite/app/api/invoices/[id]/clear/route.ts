import { NextResponse } from "next/server";
import {
  submitInvoice,
  InvoiceNotFoundError,
  InvoiceNotSignedError,
  NoCredentialsError,
  LocalCertificateSubmitError,
  AlreadySubmittedError,
  SubmissionInFlightError,
} from "@/lib/services/clearance-service";
import { requirePermission, getUserFromRequest } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { scheduleCompanyIngest } from "@/lib/ai/tenant-ingest";

export const runtime = "nodejs";

/**
 * POST /api/invoices/:id/clear — submit a signed invoice to ZATCA.
 *
 * Deliberately NOT plan-gated, unlike invoice creation. By the time an invoice
 * reaches here it has already been issued and signed, and ZATCA requires a
 * simplified invoice to be reported within 24 hours of issuance. Blocking
 * submission on an expired trial would leave the tenant holding issued
 * invoices it is legally required to file and cannot — turning a billing state
 * into a regulatory violation. The gate belongs on issuing new invoices
 * (POST /api/invoices), which is where it is.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { deny } = await requirePermission(req, "invoice:clear");
  if (deny) return deny;

  const { id } = await ctx.params;

  // Tenant isolation: the invoice must belong to the caller's company.
  const user = await getUserFromRequest(req);
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { companyId: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!user?.companyId || invoice.companyId !== user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await submitInvoice(id);
    scheduleCompanyIngest(invoice.companyId);
    const status = result.response.status === "rejected" ? 422 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (
      err instanceof InvoiceNotSignedError ||
      err instanceof NoCredentialsError ||
      err instanceof LocalCertificateSubmitError ||
      err instanceof AlreadySubmittedError ||
      err instanceof SubmissionInFlightError
    ) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
