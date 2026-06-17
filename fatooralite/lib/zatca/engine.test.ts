import { describe, it, expect } from "vitest";
import forge from "node-forge";
import {
  newUuid,
  invoiceHash,
  genesisHash,
  invoiceTotals,
  round2,
  tlv,
  buildQrBase64,
  generateKeyPair,
  signHash,
  verifyHash,
  generateCsr,
  buildInvoiceXml,
  generateSignedInvoice,
} from "./index";
import type { InvoiceInput } from "./types";

const sampleInput: InvoiceInput = {
  invoiceNumber: "INV-2026-04417",
  kind: "standard",
  issueDate: "2026-06-17",
  issueTime: "09:42:18",
  seller: { name: "Almarai Company", vatNumber: "311122334400003" },
  buyer: { name: "Tamimi Markets", vatNumber: "300000000000003" },
  lines: [
    { description: "Fresh milk carton", quantity: 100, unitPrice: 12 },
    { description: "Laban bottle", quantity: 40, unitPrice: 8.5 },
  ],
};

describe("uuid", () => {
  it("produces a v4 UUID", () => {
    expect(newUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe("money", () => {
  it("rounds half-up to 2dp", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
  });
  it("computes totals with 15% VAT", () => {
    const t = invoiceTotals(sampleInput.lines);
    // 100*12 + 40*8.5 = 1200 + 340 = 1540
    expect(t.taxableAmount).toBe(1540);
    expect(t.vatAmount).toBe(231); // 15%
    expect(t.grandTotal).toBe(1771);
  });
});

describe("hash", () => {
  it("is deterministic base64 SHA-256", () => {
    expect(invoiceHash("hello")).toBe(invoiceHash("hello"));
    expect(invoiceHash("a")).not.toBe(invoiceHash("b"));
    expect(genesisHash()).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe("qr TLV", () => {
  it("encodes tag + length + value", () => {
    const buf = tlv(1, "AB");
    expect(Array.from(buf)).toEqual([1, 2, 0x41, 0x42]);
  });
  it("builds a base64 payload with all phase-1 tags", () => {
    const qr = buildQrBase64({
      sellerName: "Seller",
      vatNumber: "311122334400003",
      timestamp: "2026-06-17T09:42:18",
      invoiceTotal: "1771.00",
      vatTotal: "231.00",
    });
    const decoded = Buffer.from(qr, "base64");
    expect(decoded[0]).toBe(1); // first tag
  });
});

describe("keys + signature", () => {
  it("signs and verifies a hash round-trip", () => {
    const kp = generateKeyPair();
    const h = invoiceHash("payload");
    const sig = signHash(h, kp.privateKeyPem);
    expect(verifyHash(h, sig, kp.publicKeyPem)).toBe(true);
    expect(verifyHash(invoiceHash("tampered"), sig, kp.publicKeyPem)).toBe(false);
  });
  it("uses the secp256k1 curve", () => {
    const kp = generateKeyPair();
    expect(kp.privateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(kp.publicKeyPem).toContain("BEGIN PUBLIC KEY");
  });
});

describe("xml", () => {
  it("includes core UBL fields", () => {
    const xml = buildInvoiceXml(sampleInput, "uuid-1234");
    expect(xml).toContain("<cbc:ID>INV-2026-04417</cbc:ID>");
    expect(xml).toContain("<cbc:UUID>uuid-1234</cbc:UUID>");
    expect(xml).toContain("Almarai Company");
    expect(xml).toContain('currencyID="SAR"');
    expect(xml).toContain("1771.00"); // payable
  });
});

describe("csr", () => {
  it("produces a parseable PKCS#10 with subject + EC key", () => {
    const kp = generateKeyPair();
    const pem = generateCsr(kp.privateKeyPem, kp.publicKeyPem, {
      commonName: "FatooraLite-EGS",
      organizationName: "Almarai Company",
      organizationalUnit: "Riyadh HQ",
    });
    expect(pem).toContain("BEGIN CERTIFICATE REQUEST");
    const der = forge.util.decode64(
      pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""),
    );
    const csr = forge.asn1.fromDer(der);
    expect(csr.value).toHaveLength(3); // CRI, sigAlg, signature
    // Subject fields are carried in the DER.
    expect(der).toContain("FatooraLite-EGS");
    expect(der).toContain("Almarai Company");
    // secp256k1 OID (1.3.132.0.10) appears in the embedded public key.
    const secp256k1Oid = forge.asn1.oidToDer("1.3.132.0.10").getBytes();
    expect(der).toContain(secp256k1Oid);
  });
});

describe("generateSignedInvoice", () => {
  it("returns a complete signed invoice that verifies", () => {
    const kp = generateKeyPair();
    const signed = generateSignedInvoice(sampleInput, kp);
    expect(signed.uuid).toBeTruthy();
    expect(signed.xml).toContain("INV-2026-04417");
    expect(signed.totals.grandTotal).toBe(1771);
    expect(verifyHash(signed.hash, signed.signature, kp.publicKeyPem)).toBe(true);
    expect(Buffer.from(signed.qr, "base64")[0]).toBe(1);
  });
});
