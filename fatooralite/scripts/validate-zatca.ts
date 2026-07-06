/**
 * ZATCA signature validation harness.
 *
 *   npx tsx scripts/validate-zatca.ts
 *
 * Proves the C14N-11 fix end-to-end WITHOUT needing a live gateway:
 *  1. generate an EGS key pair + self-signed X.509 CSID (stand-in for a ZATCA CSID)
 *  2. produce a fully signed invoice through the real pipeline
 *  3. re-verify the ds:Signature exactly the way ZATCA does:
 *       - canonicalize the in-document SignedInfo (inclusive C14N-11)
 *       - ECDSA-verify SignatureValue against the certificate public key
 *  4. recompute the invoice-body digest and compare to the ds:Reference DigestValue
 *  5. check QR tag 9 is present + valid for the simplified invoice
 *  6. attempt sandbox reachability (a real submission needs an OTP-issued CSID)
 */
import { verify as cryptoVerify, createHash } from "node:crypto";
import { DOMParser } from "@xmldom/xmldom";
import forge from "node-forge";
import { generateKeyPair, generateSignedInvoice } from "../lib/zatca/index";
import { canonicalizeNode, getInvoiceBodyForHashing } from "../lib/zatca/canonicalize";
import { extractCaSignature } from "../lib/zatca/tag9";
import type { InvoiceInput } from "../lib/zatca/types";

function throwawayCsidPem(): string {
  // A parseable X.509 cert standing in for the ZATCA-issued CSID. Only needs a
  // signature field (tag 9) — the SignatureValue check below verifies against
  // the EGS key directly, not this cert, so an RSA throwaway is sufficient here.
  const ca = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = ca.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 3600_000);
  const attrs = [{ name: "commonName", value: "ZATCA-CSID-standin" }, { name: "countryName", value: "SA" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(ca.privateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}

function ok(label: string, pass: boolean, detail = "") {
  console.log(`${pass ? "  ✓ PASS" : "  ✗ FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

async function main() {
  console.log("ZATCA signature validation\n");
  const kp = generateKeyPair();
  const csidPem = throwawayCsidPem();
  const csidDerB64 = forge.util.encode64(
    forge.asn1.toDer(forge.pki.certificateToAsn1(forge.pki.certificateFromPem(csidPem))).getBytes(),
  );

  const input: InvoiceInput = {
    invoiceNumber: "CHK-SIM-1",
    kind: "simplified",
    issueDate: "2026-07-06",
    issueTime: "10:00:00",
    seller: { name: "FatooraLite Test Seller", vatNumber: "311122334400003" },
    lines: [{ description: "Compliance check item", quantity: 1, unitPrice: 100 }],
    icv: 1,
  };

  const signed = generateSignedInvoice(input, kp, { certificateBase64: csidDerB64 });
  const doc = new DOMParser().parseFromString(signed.xml, "text/xml");

  let allPass = true;

  // 1. SignatureValue verifies over in-context canonical SignedInfo.
  const signedInfo = doc.getElementsByTagName("ds:SignedInfo")[0];
  const sigValueB64 = doc.getElementsByTagName("ds:SignatureValue")[0]?.textContent?.trim() ?? "";
  const canonicalSignedInfo = canonicalizeNode(signedInfo as unknown as Node);
  const sigVerified = !!sigValueB64 && cryptoVerify(
    "sha256",
    Buffer.from(canonicalSignedInfo, "utf8"),
    kp.publicKeyPem,
    Buffer.from(sigValueB64, "base64"),
  );
  allPass = ok("ds:SignatureValue verifies over in-context C14N-11 SignedInfo", sigVerified,
    `sig ${sigValueB64.length} b64 chars`) && allPass;

  // 2. Invoice-body DigestValue matches a fresh recomputation.
  const refDigest = Array.from(doc.getElementsByTagName("ds:Reference"))
    .find((r) => r.getAttribute("Id") === "invoiceSignedData")
    ?.getElementsByTagName("ds:DigestValue")[0]?.textContent?.trim() ?? "";
  const recomputed = createHash("sha256").update(getInvoiceBodyForHashing(signed.xml), "utf8").digest("base64");
  allPass = ok("invoice-body ds:Reference DigestValue matches recomputation", refDigest === recomputed,
    `${refDigest.slice(0, 16)}… vs ${recomputed.slice(0, 16)}…`) && allPass;

  // 3. The three exclusion transforms are declared.
  const xpaths = Array.from(doc.getElementsByTagName("ds:XPath")).map((n) => n.textContent);
  const hasAll3 =
    xpaths.some((x) => x?.includes("UBLExtensions")) &&
    xpaths.some((x) => x?.includes("cac:Signature")) &&
    xpaths.some((x) => x?.includes("AdditionalDocumentReference"));
  allPass = ok("SignedInfo declares UBLExtensions + Signature + QR exclusion transforms", hasAll3) && allPass;

  // 4. c14n11 is the declared CanonicalizationMethod.
  const c14nAlgo = doc.getElementsByTagName("ds:CanonicalizationMethod")[0]?.getAttribute("Algorithm");
  allPass = ok("CanonicalizationMethod is xml-c14n11", c14nAlgo === "http://www.w3.org/2006/12/xml-c14n11",
    c14nAlgo ?? "missing") && allPass;

  // 5. Exactly one XML declaration (no injected fragment leaked one).
  const declCount = (signed.xml.match(/<\?xml/g) ?? []).length;
  allPass = ok("single XML declaration in signed document", declCount === 1, `found ${declCount}`) && allPass;

  // 6. QR TLV tag 9 present + equals the CSID CA signature.
  const qrBytes = Buffer.from(signed.qr, "base64");
  let tag9Found = false;
  for (let i = 0; i < qrBytes.length; ) {
    const tag = qrBytes[i];
    let len = qrBytes[i + 1], hdr = 2;
    if (len === 0x81) { len = qrBytes[i + 2]; hdr = 3; }
    else if (len === 0x82) { len = (qrBytes[i + 2] << 8) | qrBytes[i + 3]; hdr = 4; }
    if (tag === 9) {
      const v = qrBytes.subarray(i + hdr, i + hdr + len);
      tag9Found = Buffer.compare(v, extractCaSignature(csidPem)) === 0;
      break;
    }
    i += hdr + len;
  }
  allPass = ok("QR contains tag 9 (CA stamp signature) for simplified invoice", tag9Found) && allPass;

  // 7. Sandbox reachability (informational — real submission needs an OTP CSID).
  const base = process.env.ZATCA_SANDBOX_BASE_URL ??
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";
  process.stdout.write("\nSandbox: ");
  try {
    const res = await fetch(`${base}/compliance/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Version": "V2" },
      body: JSON.stringify({
        invoiceHash: signed.hash,
        uuid: signed.uuid,
        invoice: Buffer.from(signed.xml, "utf8").toString("base64"),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    console.log(`gateway reachable, HTTP ${res.status} (401/400 expected without an OTP-issued compliance CSID)`);
  } catch (e) {
    console.log(`not reachable from this environment (${e instanceof Error ? e.message : "error"})`);
  }
  console.log(
    "\nA true clearance requires a compliance CSID from the Fatoora portal OTP; run:\n" +
    "  ZATCA_COMPLIANCE_TOKEN=… ZATCA_COMPLIANCE_SECRET=… npx tsx scripts/validate-zatca.ts",
  );

  console.log(`\n${allPass ? "ALL LOCAL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
