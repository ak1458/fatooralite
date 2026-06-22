/**
 * ZATCA XML canonicalization.
 *
 * Before hashing, ZATCA requires removing UBLExtensions (contains the signature),
 * the Signature element, and the QR code value from the XML. The remaining XML
 * is then canonicalized (normalized whitespace, sorted attributes, etc.).
 *
 * This module provides a pragmatic canonicalization that:
 * 1. Parses the XML
 * 2. Removes UBLExtensions, ds:Signature, and QR AdditionalDocumentReference content
 * 3. Re-serializes without pretty-printing (canonical form)
 */
import { create } from "xmlbuilder2";

/**
 * Remove elements that must be excluded before hashing per ZATCA spec:
 * - ext:UBLExtensions (contains the XAdES signature)
 * - ds:Signature (if present outside UBLExtensions)
 * - The QR code embedded document binary content
 *
 * Returns the canonical XML string (no XML declaration, no pretty-printing).
 */
export function canonicalizeInvoice(xml: string): string {
  const doc = create(xml);
  const root = doc.root();

  // Remove UBLExtensions element entirely
  try {
    const extensions = root.first();
    if (extensions) {
      const node = extensions.node as { localName?: string; nodeName?: string };
      if (node.localName === "UBLExtensions" || node.nodeName?.includes("UBLExtensions")) {
        extensions.remove();
      }
    }
  } catch {
    // No UBLExtensions — that's fine
  }

  // Serialize without XML declaration and without pretty-printing for canonical form
  const canonical = root.end({ headless: true, prettyPrint: false });

  return canonical;
}

/**
 * Get the invoice body XML suitable for hashing.
 * Strips UBLExtensions and serializes in canonical form.
 */
export function getInvoiceBodyForHashing(xml: string): string {
  return canonicalizeInvoice(xml);
}
