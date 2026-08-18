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

  // Mark the invoice as in-flight BEFORE the gateway call.
  //
  // The lifecycle documented on Invoice.status has always included "submitted",
  // but nothing ever wrote it: an invoice went straight from "signed" to
  // cleared/reported/rejected once the response came back. That left a window
  // with no record — if the process died after ZATCA accepted the document and
  // before the result was persisted (a Vercel function hitting maxDuration on a
  // slow gateway is the ordinary way this happens), the invoice still read
  // "signed", which is indistinguishable from never having been sent. The
  // operator's only move is then to send it again.
  //
  // Writing "submitted" first does not make the retry free — nothing can, short
  // of the gateway deduplicating — but ZATCA keys on invoiceHash + uuid, both of
  // which are unchanged on a resend, and the state is now truthful: an invoice
  // sitting in "submitted" is one whose fate is genuinely unknown and which
  // needs reconciling, rather than one the UI quietly reports as unsent.
  await setInvoiceStatus(invoiceId, "submitted", null, db);

  const response = await client.submit({
    input,
    uuid: invoice.uuid,
    signedXmlBase64: Buffer.from(invoice.signedXml, "utf8").toString("base64"),
    hash: invoice.hash,
  });

  const newStatus =
    response.status === "accepted"
      ? response.action === "clearance"
        ? "cleared"
        : "reported"
      : "rejected";

  // Persist the verdict atomically. These were four sequential writes, so a
  // failure between them could leave a ClearanceRecord reading "accepted" beside
  // an invoice still reading "submitted" — a state nothing could explain later.
  await db.$transaction(async (tx) => {
    const txDb = tx as unknown as PrismaClient;
    await addClearanceRecord(
      {
        invoiceId,
        action: response.action,
        status: response.status,
        responseCode: response.code,
        message: response.message,
        rawResponse: response.raw,
      },
      txDb,
    );
    await addAuditEntry({ invoiceId, kind: "apiResponse", payload: response.raw }, txDb);
    await setInvoiceStatus(invoiceId, newStatus, response.status === "rejected" ? response.code : null, txDb);

    // Keep the B2C reporting queue in sync whether this ran from the cron or a
    // manual submit: a reported simplified invoice leaves the pending queue.
    if (response.action === "reporting") {
      await txDb.invoice.update({
        where: { id: invoiceId },
        data: { reportingState: response.status === "accepted" ? "reported" : "failed" },
      });
    }
  });

  return { invoiceId, status: newStatus, response };
}
