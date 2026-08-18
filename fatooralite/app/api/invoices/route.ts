import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { zodErrorResponse } from "@/lib/validation/http";
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

  // The seller is the authenticated tenant — never whatever the client sent.
  // issueInvoice() stamps input.seller into the signed UBL and into the QR
  // code a buyer scans to verify the document, so trusting the request body
  // let any authenticated user issue a cryptographically signed invoice
  // bearing another business's name and VAT number. It is stored under their
  // own companyId either way, so this is not a data leak — it is an identity
  // assertion, which for a compliance product is worse.
  const seller = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, vatNumber: true, crNumber: true },
  });
  if (!seller) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  try {
    const validData = createInvoiceSchema.parse(input);
    const typedInput = {
      ...validData,
      seller: {
        name: seller.name,
        vatNumber: seller.vatNumber,
        ...(seller.crNumber ? { crNumber: seller.crNumber } : {}),
      },
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
  } catch (err) {
    const invalid = zodErrorResponse(err);
    if (invalid) return invalid;
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
    // Issuing holds an exclusive lock on the company's invoice-counter row for
    // the whole read → sign → write section, so simultaneous issuers on the
    // same tenant queue behind each other. Past a certain depth the queued
    // transaction hits its own timeout (Prisma P2028) and fails. Nothing is
    // half-written — the transaction rolls back and the chain stays intact,
    // verified under concurrency in the audit — so this is a "try again", not
    // a server fault, and it must say so.
    //
    // It previously fell through to the branch below and returned
    // `err.message` verbatim, which put "Invalid `prisma.$queryRaw()`
    // invocation … Transaction API error" and the internal timeout into the
    // response body of a customer-facing endpoint.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2028") {
      return NextResponse.json(
        { error: "The system is issuing another invoice for your business right now. Please try again in a moment.", retryable: true },
        { status: 503, headers: { "Retry-After": "2" } },
      );
    }
    // Never return a raw error message: it is written by whichever library
    // failed and routinely names tables, columns and query internals.
    console.error("POST /api/invoices failed:", err);
    return NextResponse.json({ error: "Could not issue the invoice. Please try again." }, { status: 500 });
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
