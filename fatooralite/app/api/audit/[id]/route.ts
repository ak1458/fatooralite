import { NextResponse } from "next/server";
import { getInvoiceAudit } from "@/lib/db/repo";
import { num } from "@/lib/db/decimal";
import { requirePermission, getUserFromRequest, isCallerCompany } from "@/lib/auth/server";

export const runtime = "nodejs";

/** GET /api/audit/:id — full audit record for one invoice (tenant-scoped). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { deny } = await requirePermission(req, "audit:view");
  if (deny) return deny;

  const { id } = await ctx.params;
  const invoice = await getInvoiceAudit(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Tenant isolation: only the owning company may read the audit trail.
  // invoice.companyId is always set (required FK), so isCallerCompany here
  // always asserts — a company-less session is denied, not waved through.
  const user = await getUserFromRequest(req);
  if (!isCallerCompany(user, invoice.companyId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({
    invoice: {
      ...invoice,
      taxableAmount: num(invoice.taxableAmount),
      vatAmount: num(invoice.vatAmount),
      grandTotal: num(invoice.grandTotal),
      lines: invoice.lines.map((l) => ({
        ...l,
        unitPrice: num(l.unitPrice),
        netAmount: num(l.netAmount),
        vatAmount: num(l.vatAmount),
      })),
    },
  });
}
