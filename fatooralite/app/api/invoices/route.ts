import { NextResponse } from "next/server";
import { issueInvoice, NoCertificateError } from "@/lib/services/invoice-service";
import { getInvoiceList } from "@/lib/db/queries";
import { createInvoiceSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
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
  if (!companyId || !input) {
    return NextResponse.json(
      { error: "companyId and input are required" },
      { status: 400 },
    );
  }

  const { deny } = await requirePermission(req, "invoice:create", companyId);
  if (deny) return deny;

  try {
    const validData = createInvoiceSchema.parse(input);
    const typedInput = {
      ...validData,
      issueTime: validData.issueTime ?? "00:00:00",
      lines: validData.lines.map(line => ({
        ...line,
        vatRate: line.vatRate ?? 0.15,
        taxCategory: line.taxCategory ?? "S"
      }))
    } as InvoiceInput;
    
    const result = await issueInvoice(companyId, typedInput);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
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
  
  const { deny } = await requirePermission(req, "audit:view", companyId);
  if (deny) return deny;

  const data = await getInvoiceList(companyId, status ? { status } : undefined);
  return NextResponse.json(data);
}
