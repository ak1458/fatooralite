import { NextResponse } from "next/server";
import { getInvoice, getCompany } from "@/lib/db/repo";
import { requirePermission } from "@/lib/auth/server";
import { generatePdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { deny, user } = await requirePermission(req, "audit:view");
  if (deny) return deny;

  const invoice = await getInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Tenant isolation: with auth enforced (the default — see lib/auth/server.ts),
  // the caller must belong to the invoice's company (a session without a
  // company gets nothing).
  if (process.env.AUTH_ENFORCE !== "false") {
    if (!user?.companyId || user.companyId !== invoice.companyId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else if (user?.companyId && user.companyId !== invoice.companyId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const company = await getCompany(invoice.companyId);
    const pdfBytes = await generatePdf(invoice, {
      xml: invoice.xml || undefined,
      lines: invoice.lines,
      seller: company
        ? {
            name: company.name,
            // The Arabic trading name is printed beside the Latin one when the
            // tenant has recorded it — ZATCA expects the human-readable invoice
            // to carry Arabic, and until the PDF could render Arabic at all
            // there was no point passing this through.
            nameAr: company.nameAr,
            vatNumber: company.vatNumber,
            address: company.address,
          }
        : undefined,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
