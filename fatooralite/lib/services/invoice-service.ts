import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import {
  createInvoice,
  attachSignature,
  getActiveCertificate,
  getLastInvoiceHash,
  addAuditEntry,
} from "@/lib/db/repo";
import {
  newUuid,
  buildInvoiceXml,
  invoiceHash,
  signHash,
  buildQrBase64,
  publicKeyDerBase64,
  genesisHash,
} from "@/lib/zatca/index";
import type { InvoiceInput, SignedInvoice } from "@/lib/zatca/types";

export class NoCertificateError extends Error {
  constructor() {
    super("No active certificate for company");
    this.name = "NoCertificateError";
  }
}

export interface IssueResult {
  invoiceId: string;
  signed: SignedInvoice;
  status: string;
}

/**
 * Issue a new invoice end-to-end: persist a draft, sign it with the company's
 * active certificate, chain the previous-invoice-hash, store the signed XML/QR,
 * and write audit entries. Returns the persisted id and the signed artifacts.
 */
export async function issueInvoice(
  companyId: string,
  input: InvoiceInput,
  db: PrismaClient = defaultDb,
): Promise<IssueResult> {
  const cert = await getActiveCertificate(companyId, db);
  if (!cert || !cert.privateKey || !cert.certificate) throw new NoCertificateError();

  const uuid = newUuid();
  const previousHash = (await getLastInvoiceHash(companyId, db)) ?? genesisHash();

  const draft = await createInvoice({ companyId, input }, uuid, db);

  const xml = buildInvoiceXml({ ...input, previousHash }, uuid);
  const hash = invoiceHash(xml);
  const signature = signHash(hash, cert.privateKey);
  const qr = buildQrBase64({
    sellerName: input.seller.name,
    vatNumber: input.seller.vatNumber,
    timestamp: `${input.issueDate}T${input.issueTime ?? "00:00:00"}`,
    invoiceTotal: draft.grandTotal.toFixed(2),
    vatTotal: draft.vatAmount.toFixed(2),
    hash,
    signature,
    publicKey: publicKeyDerBase64(cert.certificate),
  });

  await attachSignature(draft.id, { xml, hash, signature, qr, previousHash }, db);
  await addAuditEntry({ invoiceId: draft.id, kind: "xml", payload: xml }, db);
  await addAuditEntry({ invoiceId: draft.id, kind: "qr", payload: qr }, db);

  return {
    invoiceId: draft.id,
    status: "signed",
    signed: {
      uuid,
      invoiceNumber: input.invoiceNumber,
      xml,
      hash,
      signature,
      publicKeyPem: cert.certificate,
      qr,
      totals: {
        taxableAmount: draft.taxableAmount,
        vatAmount: draft.vatAmount,
        grandTotal: draft.grandTotal,
      },
    },
  };
}
