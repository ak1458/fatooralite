import { NextResponse } from "next/server";
import { searchInvoices } from "@/lib/db/repo";

export const runtime = "nodejs";

/** GET /api/audit?companyId=...&q=... — search the audit vault. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const q = url.searchParams.get("q") ?? "";
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  const invoices = await searchInvoices(companyId, q);
  return NextResponse.json({ invoices });
}
