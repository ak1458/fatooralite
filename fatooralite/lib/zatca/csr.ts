import forge from "node-forge";
import { createPublicKey, sign as cryptoSign } from "node:crypto";

const asn1 = forge.asn1;

export interface CsrSubject {
  commonName: string; // CN — usually the EGS/solution unit name
  organizationName: string; // O — company name
  organizationalUnit: string; // OU — branch
  country?: string; // C — defaults to "SA"
  serialNumber?: string; // optional device/solution serial
}

const OID = {
  cn: "2.5.4.3",
  o: "2.5.4.10",
  ou: "2.5.4.11",
  c: "2.5.4.6",
  serial: "2.5.4.5",
  ecdsaSha256: "1.2.840.10045.4.3.2",
};

function rdn(oid: string, value: string) {
  // SET { SEQUENCE { OID, UTF8String } }
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(oid).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.UTF8, false, forge.util.encodeUtf8(value)),
    ]),
  ]);
}

function buildName(s: CsrSubject) {
  const rdns = [
    rdn(OID.cn, s.commonName),
    rdn(OID.o, s.organizationName),
    rdn(OID.ou, s.organizationalUnit),
    rdn(OID.c, s.country ?? "SA"),
  ];
  if (s.serialNumber) rdns.push(rdn(OID.serial, s.serialNumber));
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, rdns);
}

/**
 * Build a PKCS#10 certificate-signing request for a secp256k1 key, signed with
 * ECDSA-SHA256. Returns a PEM string. The SubjectPublicKeyInfo is taken from
 * the EC public key's SPKI DER, so the curve is preserved exactly.
 */
export function generateCsr(
  privateKeyPem: string,
  publicKeyPem: string,
  subject: CsrSubject,
): string {
  // SubjectPublicKeyInfo straight from the EC public key.
  const spkiDer = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  const spki = asn1.fromDer(forge.util.createBuffer(Buffer.from(spkiDer).toString("binary")));

  // version INTEGER 0
  const version = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.INTEGER,
    false,
    String.fromCharCode(0),
  );

  // attributes [0] (empty)
  const attributes = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, []);

  const cri = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    version,
    buildName(subject),
    spki,
    attributes,
  ]);

  const criDer = asn1.toDer(cri).getBytes();
  const signature = cryptoSign("sha256", Buffer.from(criDer, "binary"), privateKeyPem);

  const sigAlg = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(OID.ecdsaSha256).getBytes()),
  ]);

  const sigBits = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.BITSTRING,
    false,
    String.fromCharCode(0) + signature.toString("binary"),
  );

  const csr = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [cri, sigAlg, sigBits]);
  const der = asn1.toDer(csr).getBytes();
  const b64 = forge.util.encode64(der);
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN CERTIFICATE REQUEST-----\n${lines.join("\n")}\n-----END CERTIFICATE REQUEST-----\n`;
}
