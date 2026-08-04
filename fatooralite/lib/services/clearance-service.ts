import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { addClearanceRecord, addAuditEntry, setInvoiceStatus, getActiveCertificate } from "@/lib/db/repo";
import { num } from "@/lib/db/decimal";
import { ZatcaClient } from "@/lib/zatca/client";
import type { ZatcaResponse, ZatcaSubmitter } from "@/lib/zatca/client";
import type { InvoiceInput } from "@/lib/zatca/types";

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}
export class InvoiceNotSignedError extends Error {
  constructor() {
    super("Invoice must be signed before submission");
    this.name = "InvoiceNotSignedError";
  }
}
export class NoCredentialsError extends Error {
  constructor() {
    super("No active production certificate with ZATCA credentials");
    this.name = "NoCredentialsError";
  }
}
export class LocalCertificateSubmitError extends Error {
  constructor() {
    super("Invoices signed with local development certificates cannot be cleared on ZATCA. Connect real ZATCA in Integration settings first.");
    this.name = "LocalCertificateSubmitError";
  }
}
export class AlreadySubmittedError extends Error {
  constructor(public readonly status: string) {
    super(`Invoice is already ${status} — submitting again would resend it to the live ZATCA gateway.`);
    this.name = "AlreadySubmittedError";
  }
}

export interface SubmitResult {
  invoiceId: string;
  status: string; // resulting invoice status
  response: ZatcaResponse;
}

/**
 * Submit a signed invoice to ZATCA (clearance for standard, reporting for
 * simplified), persist the gateway record + audit entry, and update the
 * invoice status. The ZATCA mode (simulation/sandbox/production) is decided by
 * the injected client (defaults to env ZATCA_MODE / simulation).
 */
export async function submitInvoice(
  invoiceId: string,
  submitter?: ZatcaSubmitter,
  db: PrismaClient = defaultDb,
): Promise<SubmitResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true, company: true },
  });
  if (!invoice) throw new InvoiceNotFoundError();
  if (!invoice.signedXml || !invoice.hash) throw new InvoiceNotSignedError();
  // Guard against re-submitting an already-cleared/reported invoice — a
  // double-click, a retried network request, or (previously) the IDOR fixed
  // in lib/auth/server.ts could otherwise resubmit the same invoice to the
  // live ZATCA gateway repeatedly, each time appending another
  // clearanceRecord/audit row and risking a duplicate-submission flag on
  // ZATCA's side.
  if (invoice.status === "cleared" || invoice.status === "reported") {
    throw new AlreadySubmittedError(invoice.status);
  }

  // Build the real ZATCA client from the company's production credentials
  // unless a submitter was injected (tests).
  let client = submitter;
  if (!client) {
    const cert = await getActiveCertificate(invoice.companyId, db);
    if (!cert?.token || !cert.secret) throw new NoCredentialsError();
    if (cert.secret === "LOCAL-DEV-SECRET") {
      throw new LocalCertificateSubmitError();
    }
    client = new ZatcaClient({ token: cert.token, secret: cert.secret });
  }

  const input: InvoiceInput = {
    invoiceNumber: invoice.invoiceNumber,
    kind: invoice.kind as InvoiceInput["kind"],
    issueDate: invoice.issueDate,
    issueTime: invoice.issueTime,
    seller: { name: invoice.company.name, vatNumber: invoice.company.vatNumber },
    buyer: invoice.buyerName
      ? { name: invoice.buyerName, vatNumber: invoice.buyerVat ?? undefined }
      : undefined,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: num(l.unitPrice),
      vatRate: l.vatRate,
    })),
  };

  const response = await client.submit({
    input,
    uuid: invoice.uuid,
    signedXmlBase64: Buffer.from(invoice.signedXml, "utf8").toString("base64"),
    hash: invoice.hash,
  });

  await addClearanceRecord(
    {
      invoiceId,
      action: response.action,
      status: response.status,
      responseCode: response.code,
      message: response.message,
      rawResponse: response.raw,
    },
    db,
  );
  await addAuditEntry({ invoiceId, kind: "apiResponse", payload: response.raw }, db);

  let newStatus: string;
  if (response.status === "accepted") {
    newStatus = response.action === "clearance" ? "cleared" : "reported";
  } else {
    newStatus = "rejected";
  }
  await setInvoiceStatus(invoiceId, newStatus, response.status === "rejected" ? response.code : null, db);

  // Keep the B2C reporting queue in sync whether this ran from the cron or a
  // manual submit: a reported simplified invoice leaves the pending queue.
  if (response.action === "reporting") {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { reportingState: response.status === "accepted" ? "reported" : "failed" },
    });
  }

  return { invoiceId, status: newStatus, response };
}
