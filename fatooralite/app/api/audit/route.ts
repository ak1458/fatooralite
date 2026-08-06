import { NextResponse } from "next/server";
import { searchInvoices } from "@/lib/db/repo";
import { num } from "@/lib/db/decimal";
import { requirePermission } from "@/lib/auth/server";

export const runtime = "nodejs";

/** GET /api/audit?companyId=...&q=... — search the audit vault. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const q = url.searchParams.get("q") ?? "";
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const invoices = (await searchInvoices(companyId, q)).map((inv) => ({
    ...inv,
    taxableAmount: num(inv.taxableAmount),
    vatAmount: num(inv.vatAmount),
    grandTotal: num(inv.grandTotal),
  }));
  return NextResponse.json({ invoices });
}
