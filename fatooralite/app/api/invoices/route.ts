import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { issueInvoice, NoCertificateError } from "@/lib/services/invoice-service";
import { getInvoiceList } from "@/lib/db/queries";
import { createInvoiceSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/auth/server";
import { scheduleCompanyIngest } from "@/lib/ai/tenant-ingest";
import { checkInvoiceLimit, requireFeature } from "@/lib/billing/plan";
import { featureLocked, limitReached } from "@/lib/billing/deny";
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

  // Two separate gates: the entitlement (an expired trial cannot issue at all)
  // and the volume cap (a live trial can, up to its monthly allowance).
  const denial = await requireFeature(companyId, "issueInvoice");
  if (denial) return featureLocked(denial);

  const invoiceLimit = await checkInvoiceLimit(companyId);
  if (!invoiceLimit.allowed) return limitReached(invoiceLimit, "invoices");

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
    scheduleCompanyIngest(companyId);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    if (err instanceof NoCertificateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    // schema.prisma's @@unique([companyId, invoiceNumber]) correctly blocks a
    // true duplicate (e.g. a retried request with an explicit invoiceNumber)
    // — but left uncaught this is a legitimate client-side conflict, not a
    // server fault, and the generic branch below would leak the raw Prisma
    // constraint-violation message in the response body.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An invoice with this number already exists for this company." }, { status: 409 });
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
