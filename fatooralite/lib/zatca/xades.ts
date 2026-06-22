/**
 * XAdES-EPES Enveloped Signature for ZATCA invoices.
 *
 * Builds the UBLExtensions/ds:Signature block containing:
 * - SignedInfo with references (invoice body digest, SignedProperties digest)
 * - SignatureValue (ECDSA-SHA256)
 * - KeyInfo with X509 certificate
 * - SignedProperties (signing time, cert digest, issuer serial)
 *
 * This is what ZATCA actually verifies when clearing/reporting an invoice.
 */
import { createHash, sign as cryptoSign } from "node:crypto";
import { create } from "xmlbuilder2";
import { rawHash } from "./hash";
import { getInvoiceBodyForHashing } from "./canonicalize";

export interface XadesSigningInfo {
  /** The full invoice XML (before signature injection). */
  invoiceXml: string;
  /** PEM-encoded EC private key (secp256k1). */
  privateKeyPem: string;
  /** Base64-encoded X509 certificate (the issued CSID cert, or self-signed for dev). */
  certificateBase64?: string;
  /** Certificate serial number (hex string). */
  certificateSerialNumber?: string;
  /** Certificate issuer distinguished name. */
  certificateIssuer?: string;
  /** Signing timestamp (ISO 8601). Defaults to now. */
  signingTime?: string;
}

/**
 * Build the XAdES enveloped signature XML fragment.
 * Returns the complete ds:Signature XML string to embed in UBLExtensions.
 */
export function buildXadesSignature(info: XadesSigningInfo): string {
  const now = info.signingTime ?? new Date().toISOString();
  const certB64 = info.certificateBase64 ?? "";
  const certSerial = info.certificateSerialNumber ?? "0";
  const certIssuer = info.certificateIssuer ?? "CN=ZATCA,O=ZATCA,C=SA";

  // 1. Compute the invoice body digest (excluding UBLExtensions)
  const invoiceBodyCanonical = getInvoiceBodyForHashing(info.invoiceXml);
  const invoiceBodyDigest = rawHash(invoiceBodyCanonical);

  // 2. Build SignedProperties and compute its digest
  const signedPropertiesXml = buildSignedProperties({
    signingTime: now,
    certDigest: computeCertDigest(certB64),
    certIssuer,
    certSerial,
  });
  const signedPropertiesDigest = rawHash(signedPropertiesXml);

  // 3. Build SignedInfo
  const signedInfoXml = buildSignedInfo(invoiceBodyDigest, signedPropertiesDigest);

  // 4. Compute SignatureValue = ECDSA-SHA256(SignedInfo canonical)
  const signatureValue = computeSignatureValue(signedInfoXml, info.privateKeyPem);

  // 5. Assemble the complete ds:Signature
  const sig = create().ele("ds:Signature", {
    xmlns: "urn:oasis:names:specification:ubl:dsig:enveloped:xades",
    "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
    "xmlns:xades": "http://uri.etsi.org/01903/v1.3.2#",
    Id: "signature",
  });

  // SignedInfo
  sig.import(create(signedInfoXml));

  // SignatureValue
  sig.ele("ds:SignatureValue").txt(signatureValue).up();

  // KeyInfo
  const keyInfo = sig.ele("ds:KeyInfo");
  keyInfo
    .ele("ds:X509Data")
    .ele("ds:X509Certificate")
    .txt(certB64)
    .up()
    .up();
  keyInfo.up();

  // Object with QualifyingProperties
  const obj = sig.ele("ds:Object");
  const qp = obj.ele("xades:QualifyingProperties", {
    Target: "#signature",
  });

  // Import the SignedProperties
  qp.import(create(signedPropertiesXml));

  qp.up();
  obj.up();
  sig.up();

  return sig.end({ prettyPrint: true });
}

/** Build the SignedProperties XML for the XAdES signature. */
function buildSignedProperties(params: {
  signingTime: string;
  certDigest: string;
  certIssuer: string;
  certSerial: string;
}): string {
  const sp = create()
    .ele("xades:SignedProperties", {
      "xmlns:xades": "http://uri.etsi.org/01903/v1.3.2#",
      "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
      Id: "xadesSignedProperties",
    });

  const ssp = sp.ele("xades:SignedSignatureProperties");
  ssp.ele("xades:SigningTime").txt(params.signingTime).up();

  const sc = ssp.ele("xades:SigningCertificate").ele("xades:Cert");
  sc.ele("xades:CertDigest")
    .ele("ds:DigestMethod", { Algorithm: "http://www.w3.org/2001/04/xmlenc#sha256" }).up()
    .ele("ds:DigestValue").txt(params.certDigest).up()
    .up();
  sc.ele("xades:IssuerSerial")
    .ele("ds:X509IssuerName").txt(params.certIssuer).up()
    .ele("ds:X509SerialNumber").txt(params.certSerial).up()
    .up();
  sc.up().up(); // Cert, SigningCertificate
  ssp.up(); // SignedSignatureProperties

  sp.up();

  return sp.end({ prettyPrint: false });
}

/** Build the SignedInfo block with two references. */
function buildSignedInfo(invoiceDigest: string, propsDigest: string): string {
  const si = create()
    .ele("ds:SignedInfo", {
      "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
    });

  si.ele("ds:CanonicalizationMethod", {
    Algorithm: "http://www.w3.org/2006/12/xml-c14n11",
  }).up();
  si.ele("ds:SignatureMethod", {
    Algorithm: "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256",
  }).up();

  // Reference 1: invoice body
  const ref1 = si.ele("ds:Reference", {
    Id: "invoiceSignedData",
    URI: "",
  });
  ref1.ele("ds:Transforms")
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/TR/1999/REC-xpath-19991116" })
    .ele("ds:XPath").txt("not(//ancestor-or-self::ext:UBLExtensions)").up()
    .up()
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/2006/12/xml-c14n11" }).up()
    .up();
  ref1.ele("ds:DigestMethod", { Algorithm: "http://www.w3.org/2001/04/xmlenc#sha256" }).up();
  ref1.ele("ds:DigestValue").txt(invoiceDigest).up();
  ref1.up();

  // Reference 2: signed properties
  const ref2 = si.ele("ds:Reference", {
    Type: "http://www.w3.org/2000/09/xmldsig#SignatureProperties",
    URI: "#xadesSignedProperties",
  });
  ref2.ele("ds:DigestMethod", { Algorithm: "http://www.w3.org/2001/04/xmlenc#sha256" }).up();
  ref2.ele("ds:DigestValue").txt(propsDigest).up();
  ref2.up();

  si.up();

  return si.end({ prettyPrint: false });
}

/** SHA-256 digest of the certificate bytes. */
function computeCertDigest(certBase64: string): string {
  if (!certBase64) return "";
  const certBytes = Buffer.from(certBase64, "base64");
  return createHash("sha256").update(certBytes).digest("base64");
}

/** ECDSA-SHA256 sign the SignedInfo XML. */
function computeSignatureValue(signedInfoXml: string, privateKeyPem: string): string {
  const sig = cryptoSign("sha256", Buffer.from(signedInfoXml, "utf8"), privateKeyPem);
  return sig.toString("base64");
}

/**
 * Inject the XAdES signature into the invoice XML.
 * Replaces the empty ExtensionContent placeholder with the full ds:Signature.
 */
export function injectSignature(invoiceXml: string, signatureXml: string): string {
  // Replace the empty ExtensionContent with the signature
  return invoiceXml.replace(
    /<ext:ExtensionContent><\/ext:ExtensionContent>/,
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`,
  ).replace(
    /<ext:ExtensionContent\/>/,
    `<ext:ExtensionContent>${signatureXml}</ext:ExtensionContent>`,
  ).replace(
    // Handle the pretty-printed version with empty text node
    /(<ext:ExtensionContent>)\s*(<\/ext:ExtensionContent>)/,
    `$1${signatureXml}$2`,
  );
}

/**
 * Inject the QR code base64 into the QR AdditionalDocumentReference.
 */
export function injectQrCode(invoiceXml: string, qrBase64: string): string {
  // Find the QR reference and fill in the EmbeddedDocumentBinaryObject
  const qrRefPattern = /(<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>)([\s\S]*?)(<\/cbc:EmbeddedDocumentBinaryObject>)/;
  return invoiceXml.replace(qrRefPattern, `$1${qrBase64}$3`);
}
