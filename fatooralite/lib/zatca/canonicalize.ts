/**
 * ZATCA XML canonicalization (C14N 1.1).
 *
 * The digest ZATCA verifies for the invoice `ds:Reference` is computed over the
 * canonical byte stream AFTER applying three exclusion transforms:
 *   1. remove `ext:UBLExtensions`      (holds the XAdES signature)
 *   2. remove `cac:Signature`          (UBL signature marker)
 *   3. remove the QR `cac:AdditionalDocumentReference` (cbc:ID = "QR")
 *
 * The QR must be excluded because it carries the invoice hash + signature and is
 * populated AFTER signing — leaving it in would make the digest depend on itself.
 * ZATCA declares `xml-c14n11`; for UBL invoices (no xml:base / xml:id) inclusive
 * C14N 1.0 is byte-identical to 1.1, and that is what xml-crypto implements.
 */
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { C14nCanonicalization } from "xml-crypto";

/** Canonicalize a DOM node (or full document root) with C14N (c14n11-equivalent). */
export function canonicalizeNode(node: Node): string {
  // xml-crypto's process() renders in-scope namespaces at the apex element and
  // preserves textual whitespace — the ZATCA-required canonical form.
  return new C14nCanonicalization().process(node as never, {}) as string;
}

/**
 * Canonicalize a standalone XML fragment string (e.g. the SignedInfo block).
 * Used before ECDSA-signing SignedInfo so the signed bytes match what ZATCA
 * canonicalizes on its side.
 */
export function canonicalizeXml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return canonicalizeNode(doc.documentElement as unknown as Node);
}

function removeAll(doc: Document, tagName: string): void {
  const nodes = Array.from(doc.getElementsByTagName(tagName));
  for (const n of nodes) n.parentNode?.removeChild(n);
}

/**
 * Produce the canonical invoice body for hashing / the invoice `ds:Reference`
 * digest: strip UBLExtensions, cac:Signature, and the QR AdditionalDocument
 * Reference, then C14N the remaining document. Order-independent of whether the
 * signature or QR have been injected yet.
 */
export function getInvoiceBodyForHashing(xml: string): string {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, "text/xml") as unknown as Document;
    if (!doc?.documentElement) return xml; // not parseable XML → hash the raw input
  } catch {
    // Defensive: never let a malformed/non-XML input throw out of the hasher.
    return xml;
  }

  removeAll(doc, "ext:UBLExtensions");
  removeAll(doc, "cac:Signature");

  // Remove only the AdditionalDocumentReference whose cbc:ID is "QR".
  const refs = Array.from(doc.getElementsByTagName("cac:AdditionalDocumentReference"));
  for (const ref of refs) {
    const id = ref.getElementsByTagName("cbc:ID")[0]?.textContent?.trim();
    if (id === "QR") ref.parentNode?.removeChild(ref);
  }

  return canonicalizeNode(doc.documentElement as unknown as Node);
}

/** Back-compat alias (kept for existing imports). */
export function canonicalizeInvoice(xml: string): string {
  return getInvoiceBodyForHashing(xml);
}

// Re-export the serializer for callers that need raw serialization.
export { XMLSerializer };
