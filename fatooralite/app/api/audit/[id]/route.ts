import { NextResponse } from "next/server";
import { getInvoiceAudit } from "@/lib/db/repo";

export const runtime = "nodejs";

/** GET /api/audit/:id — full audit record for one invoice. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const invoice = await getInvoiceAudit(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}
