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
import { DOMParser } from "@xmldom/xmldom";
import { rawHash } from "./hash";
import { getInvoiceBodyForHashing, canonicalizeNodeInContext, canonicalizeXml } from "./canonicalize";

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

  // 2. Build SignedProperties and compute its digest over the CANONICALIZED
  //    form, not the raw xmlbuilder2 serialization — SignedProperties
  //    declares its own namespaces (self-contained, no ancestor-namespace
  //    dependency), but different XML serializers can still disagree on
  //    attribute order/quoting/whitespace for "the same" logical XML.
  //    Canonicalizing removes that ambiguity and matches Reference 1's
  //    treatment (see the c14n11 Transform added on Reference 2 below).
  const signedPropertiesXml = buildSignedProperties({
    signingTime: now,
    certDigest: computeCertDigest(certB64),
    certIssuer,
    certSerial,
  });
  const signedPropertiesDigest = rawHash(canonicalizeXml(signedPropertiesXml));

  // 3. Build SignedInfo
  const signedInfoXml = buildSignedInfo(invoiceBodyDigest, signedPropertiesDigest);

  // 4. SignatureValue is filled in by finalizeSignatureValue() AFTER this
  //    signature is injected into the invoice — the SignedInfo must be
  //    canonicalized in its final in-document namespace context (inclusive C14N
  //    renders the Invoice's inherited namespaces onto SignedInfo), which does
  //    not exist yet. Placeholder for now.
  const signatureValue = "";

  // 5. Assemble the complete ds:Signature.
  //    ZATCA declares ONLY xmlns:ds on the Signature element. A default xmlns
  //    or an xmlns:xades here would be inherited into SignedInfo under inclusive
  //    C14N and change its canonical bytes — breaking the SignatureValue check.
  //    The xades namespace is declared where it is used (SignedProperties).
  const sig = create().ele("ds:Signature", {
    "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
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

  // Object with QualifyingProperties. Declare xmlns:xades HERE (not on
  // ds:Signature) so the xades prefix resolves without leaking into the
  // SignedInfo namespace context — QualifyingProperties is under ds:Object,
  // a sibling of SignedInfo, so it never affects the signed canonical bytes.
  const obj = sig.ele("ds:Object");
  const qp = obj.ele("xades:QualifyingProperties", {
    "xmlns:xades": "http://uri.etsi.org/01903/v1.3.2#",
    Target: "#signature",
  });

  // Import the SignedProperties
  qp.import(create(signedPropertiesXml));

  qp.up();
  obj.up();
  sig.up();

  // headless: no <?xml?> declaration — this fragment is injected INTO the
  // invoice's UBLExtensions, and a second declaration mid-document is invalid.
  return sig.end({ prettyPrint: false, headless: true });
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

  return sp.end({ prettyPrint: false, headless: true });
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

  // Reference 1: invoice body. ZATCA's transform set excludes UBLExtensions,
  // cac:Signature, and the QR AdditionalDocumentReference, THEN canonicalizes
  // with c14n11. The digest must be computed over exactly this node-set (see
  // getInvoiceBodyForHashing) or the gateway recomputes a different digest.
  const ref1 = si.ele("ds:Reference", {
    Id: "invoiceSignedData",
    URI: "",
  });
  ref1.ele("ds:Transforms")
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/TR/1999/REC-xpath-19991116" })
    .ele("ds:XPath").txt("not(//ancestor-or-self::ext:UBLExtensions)").up()
    .up()
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/TR/1999/REC-xpath-19991116" })
    .ele("ds:XPath").txt("not(//ancestor-or-self::cac:Signature)").up()
    .up()
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/TR/1999/REC-xpath-19991116" })
    .ele("ds:XPath").txt("not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])").up()
    .up()
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/2006/12/xml-c14n11" }).up()
    .up();
  ref1.ele("ds:DigestMethod", { Algorithm: "http://www.w3.org/2001/04/xmlenc#sha256" }).up();
  ref1.ele("ds:DigestValue").txt(invoiceDigest).up();
  ref1.up();

  // Reference 2: signed properties. Declares the same c14n11 Transform used
  // to produce signedPropertiesDigest above, so a verifier applies the same
  // canonicalization before comparing digests (an un-declared Transform is
  // exactly the class of mismatch the SignedInfo ancestor-namespace fix
  // above addresses for Reference 1 — don't reintroduce it here).
  const ref2 = si.ele("ds:Reference", {
    Type: "http://www.w3.org/2000/09/xmldsig#SignatureProperties",
    URI: "#xadesSignedProperties",
  });
  ref2.ele("ds:Transforms")
    .ele("ds:Transform", { Algorithm: "http://www.w3.org/2006/12/xml-c14n11" }).up()
    .up();
  ref2.ele("ds:DigestMethod", { Algorithm: "http://www.w3.org/2001/04/xmlenc#sha256" }).up();
  ref2.ele("ds:DigestValue").txt(propsDigest).up();
  ref2.up();

  si.up();

  return si.end({ prettyPrint: false, headless: true });
}

/** SHA-256 digest of the certificate bytes. */
function computeCertDigest(certBase64: string): string {
  if (!certBase64) return "";
  const certBytes = Buffer.from(certBase64, "base64");
  return createHash("sha256").update(certBytes).digest("base64");
}

/**
 * Fill in ds:SignatureValue after the signature has been injected into the
 * invoice. Canonicalizes the SignedInfo *in its final document context* (so
 * inclusive C14N-11 renders exactly the inherited namespaces ZATCA will see),
 * ECDSA-SHA256 signs those bytes, and writes the result into the empty
 * SignatureValue element. This is the step that makes the stamp verify on the
 * gateway. Call once, on the fully-assembled signed XML, before hashing/QR.
 */
export function finalizeSignatureValue(signedXml: string, privateKeyPem: string): string {
  const doc = new DOMParser().parseFromString(signedXml, "text/xml");
  const signedInfo = doc.getElementsByTagName("ds:SignedInfo")[0];
  if (!signedInfo) throw new Error("finalizeSignatureValue: no ds:SignedInfo in document");

  // SignedInfo declares only xmlns:ds on itself — the Invoice root's 4
  // namespaces (default, cac, cbc, ext) are inherited from many levels up.
  // Inclusive C14N-11 (what SignedInfo's own CanonicalizationMethod
  // declares) must render those inherited namespaces onto the canonicalized
  // apex regardless — canonicalizeNode() alone doesn't do this (see its
  // sibling canonicalizeNodeInContext for why), which silently produced
  // signed bytes ZATCA's verifier would never reproduce from the same
  // document. Use the context-aware canonicalizer here specifically.
  const canonical = canonicalizeNodeInContext(signedInfo as unknown as Node);
  const signatureValue = cryptoSign("sha256", Buffer.from(canonical, "utf8"), privateKeyPem)
    .toString("base64");

  // Replace the empty SignatureValue element (self-closing or empty pair).
  return signedXml
    .replace(/<ds:SignatureValue\s*\/>/, `<ds:SignatureValue>${signatureValue}</ds:SignatureValue>`)
    .replace(
      /<ds:SignatureValue>\s*<\/ds:SignatureValue>/,
      `<ds:SignatureValue>${signatureValue}</ds:SignatureValue>`,
    );
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
