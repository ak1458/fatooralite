import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { num } from "@/lib/db/decimal";
import {
  createInvoice,
  attachSignature,
  getActiveCertificate,
  nextChainSlot,
  commitChainHash,
  addAuditEntry,
} from "@/lib/db/repo";
import {
  newUuid,
  buildInvoiceXml,
  invoiceHash,
  signHash,
  buildQrBase64,
  publicKeyDerBase64,
} from "@/lib/zatca/index";
import { buildXadesSignature, injectSignature, injectQrCode, finalizeSignatureValue } from "@/lib/zatca/xades";
import { tag9Base64, isRealCsid } from "@/lib/zatca/tag9";
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
  const privateKey = cert.privateKey;
  const publicKey = cert.publicKey;

  const uuid = newUuid();
  const timestamp = `${input.issueDate}T${input.issueTime ?? "00:00:00"}`;

  // The entire chain-critical section runs under one interactive transaction:
  // the FOR UPDATE lock in nextChainSlot is held across read → sign → write so
  // concurrent serverless invocations cannot fork the PIH/ICV chain. Signing is
  // CPU-bound and fast, so holding the lock across it is safe.
  return db.$transaction(
    async (tx) => {
      const txDb = tx as unknown as PrismaClient;

      // 1. Reserve the chain slot (locks the per-company counter row).
      const { icv, previousHash } = await nextChainSlot(companyId, txDb);

      const invoiceNumber =
        input.invoiceNumber?.trim() ||
        `INV-${input.issueDate.slice(0, 4)}-${String(icv).padStart(5, "0")}`;

      const enrichedInput: InvoiceInput = { ...input, invoiceNumber, previousHash, icv };

      // Simplified (B2C) invoices are reported within 24h; stamp the deadline.
      const reportingDeadline =
        input.kind === "simplified"
          ? new Date(Date.parse(timestamp) + 24 * 3600_000)
          : null;

      const draft = await createInvoice(
        { companyId, input: enrichedInput },
        uuid,
        txDb,
        { reportingDeadline },
      );

      // 2. Build base XML.
      let xml = buildInvoiceXml(enrichedInput, uuid);

      // 3. Build + inject the XAdES signature.
      const signatureXml = buildXadesSignature({
        invoiceXml: xml,
        privateKeyPem: privateKey,
        certificateBase64: cert.token ?? undefined,
        signingTime: timestamp,
      });
      xml = injectSignature(xml, signatureXml);

      // 3b. Sign the in-context SignedInfo and fill in SignatureValue.
      xml = finalizeSignatureValue(xml, privateKey);

      // 4. Hash the canonical invoice (excludes UBLExtensions/Signature/QR).
      const hash = invoiceHash(xml);
      const signature = signHash(hash, privateKey);

      // 5. Build QR. Tag 9 (CA stamp signature) is required for simplified
      //    invoices and only available once a real CSID is issued.
      const stampSignature =
        input.kind === "simplified" && isRealCsid(cert.token)
          ? tag9Base64(cert.token!)
          : undefined;
      const qr = buildQrBase64({
        sellerName: input.seller.name,
        vatNumber: input.seller.vatNumber,
        timestamp,
        invoiceTotal: draft.grandTotal.toFixed(2),
        vatTotal: draft.vatAmount.toFixed(2),
        hash,
        signature,
        publicKey: publicKeyDerBase64(publicKey),
        stampSignature,
      });

      // 6. Inject QR into the XML.
      xml = injectQrCode(xml, qr);

      await attachSignature(draft.id, { xml, hash, signature, qr, previousHash }, txDb);

      // 7. Commit this hash as the next PIH before releasing the lock.
      await commitChainHash(companyId, icv, hash, txDb);

      await addAuditEntry({ invoiceId: draft.id, kind: "xml", payload: xml }, txDb);
      await addAuditEntry({ invoiceId: draft.id, kind: "signedXml", payload: xml }, txDb);
      await addAuditEntry({ invoiceId: draft.id, kind: "qr", payload: qr }, txDb);

      return {
        invoiceId: draft.id,
        status: "signed",
        signed: {
          uuid,
          invoiceNumber,
          xml,
          hash,
          signature,
          publicKeyPem: publicKey,
          qr,
          totals: {
            taxableAmount: num(draft.taxableAmount),
            vatAmount: num(draft.vatAmount),
            grandTotal: num(draft.grandTotal),
            allowanceTotalAmount: 0,
            chargeTotalAmount: 0,
            taxSubtotals: [],
          },
        },
      };
    },
    { timeout: 20_000 },
  );
}
