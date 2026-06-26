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

  // Tenant isolation
  if (user?.companyId && user.companyId !== invoice.companyId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const company = await getCompany(invoice.companyId);
    const pdfBytes = await generatePdf(invoice, {
      xml: invoice.xml || undefined,
      lines: invoice.lines,
      seller: company
        ? { name: company.name, vatNumber: company.vatNumber, address: company.address }
        : undefined,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice_${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
