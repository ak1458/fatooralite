import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import {
  createInvoice,
  attachSignature,
  getActiveCertificate,
  getLastInvoiceHash,
  getNextIcv,
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
import { buildXadesSignature, injectSignature, injectQrCode } from "@/lib/zatca/xades";
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
 * active certificate, chain the previous-invoice-hash, build the XAdES signature,
 * store the signed XML/QR, and write audit entries.
 */
export async function issueInvoice(
  companyId: string,
  input: InvoiceInput,
  db: PrismaClient = defaultDb,
): Promise<IssueResult> {
  const cert = await getActiveCertificate(companyId, db);
  if (!cert || !cert.privateKey || !cert.publicKey) throw new NoCertificateError();

  const uuid = newUuid();
  const previousHash = (await getLastInvoiceHash(companyId, db)) ?? genesisHash();
  const icv = await getNextIcv(companyId, db);

  // Enrich input with chain data
  const enrichedInput: InvoiceInput = {
    ...input,
    previousHash,
    icv,
  };

  const draft = await createInvoice({ companyId, input: enrichedInput }, uuid, db);

  // Step 1: Build base XML
  let xml = buildInvoiceXml(enrichedInput, uuid);

  // Step 2: Build and inject XAdES signature
  const timestamp = `${input.issueDate}T${input.issueTime ?? "00:00:00"}`;
  const signatureXml = buildXadesSignature({
    invoiceXml: xml,
    privateKeyPem: cert.privateKey,
    certificateBase64: cert.token ?? undefined,
    signingTime: timestamp,
  });
  xml = injectSignature(xml, signatureXml);

  // Step 3: Hash the canonical invoice (excluding UBLExtensions)
  const hash = invoiceHash(xml);
  const signature = signHash(hash, cert.privateKey);

  // Step 4: Build QR with binary tags
  const qr = buildQrBase64({
    sellerName: input.seller.name,
    vatNumber: input.seller.vatNumber,
    timestamp,
    invoiceTotal: draft.grandTotal.toFixed(2),
    vatTotal: draft.vatAmount.toFixed(2),
    hash,
    signature,
    publicKey: publicKeyDerBase64(cert.publicKey),
  });

  // Step 5: Inject QR into XML
  xml = injectQrCode(xml, qr);

  await attachSignature(draft.id, { xml, hash, signature, qr, previousHash }, db);
  await addAuditEntry({ invoiceId: draft.id, kind: "xml", payload: xml }, db);
  await addAuditEntry({ invoiceId: draft.id, kind: "signedXml", payload: xml }, db);
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
      publicKeyPem: cert.publicKey,
      qr,
      totals: {
        taxableAmount: draft.taxableAmount,
        vatAmount: draft.vatAmount,
        grandTotal: draft.grandTotal,
        allowanceTotalAmount: 0,
        chargeTotalAmount: 0,
        taxSubtotals: [],
      },
    },
  };
}
