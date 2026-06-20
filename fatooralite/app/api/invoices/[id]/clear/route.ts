import { NextResponse } from "next/server";
import {
  submitInvoice,
  InvoiceNotFoundError,
  InvoiceNotSignedError,
} from "@/lib/services/clearance-service";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

/** POST /api/invoices/:id/clear — submit a signed invoice to ZATCA. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { deny } = await requirePermission(req, "invoice:clear");
  if (deny) return deny;

  const { id } = await ctx.params;
  try {
    const result = await submitInvoice(id);
    const status = result.response.status === "rejected" ? 422 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvoiceNotSignedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
