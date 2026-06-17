import { NextResponse } from "next/server";
import { issueInvoice, NoCertificateError } from "@/lib/services/invoice-service";
import { listInvoices } from "@/lib/db/repo";
import type { InvoiceInput } from "@/lib/zatca/types";

export const runtime = "nodejs";

/** POST /api/invoices — issue (create + sign) a new invoice. */
export async function POST(req: Request) {
  let body: { companyId?: string; input?: InvoiceInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId, input } = body;
  if (!companyId || !input?.invoiceNumber || !input.lines?.length) {
    return NextResponse.json(
      { error: "companyId, input.invoiceNumber and input.lines are required" },
      { status: 400 },
    );
  }

  try {
    const result = await issueInvoice(companyId, input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof NoCertificateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/invoices?companyId=...&status=... — list invoices. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const status = url.searchParams.get("status") ?? undefined;
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  const invoices = await listInvoices(companyId, status ? { status } : undefined);
  return NextResponse.json({ invoices });
}
