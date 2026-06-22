import forge from "node-forge";
import { createPublicKey, sign as cryptoSign } from "node:crypto";

const asn1 = forge.asn1;

export interface CsrSubject {
  commonName: string;          // CN — usually the EGS/solution unit name
  organizationName: string;    // O — company name
  organizationalUnit: string;  // OU — branch
  country?: string;            // C — defaults to "SA"
  serialNumber?: string;       // device/solution serial number
}

/** ZATCA-specific CSR extension fields for the SAN and template OID. */
export interface ZatcaExtensions {
  /** EGS serial number (e.g., "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f"). */
  egsSerialNumber?: string;
  /** VAT registration number (15-digit). */
  vatNumber?: string;
  /** Invoice type: "1100" (standard+simplified) or "1000" (standard only) or "0100" (simplified only). */
  invoiceType?: string;
  /** Branch/location identifier. */
  location?: string;
  /** Industry business category. */
  industryBusinessCategory?: string;
}

const OID = {
  cn: "2.5.4.3",
  o: "2.5.4.10",
  ou: "2.5.4.11",
  c: "2.5.4.6",
  serial: "2.5.4.5",
  ecdsaSha256: "1.2.840.10045.4.3.2",
  // ZATCA custom extension OIDs
  templateName: "1.3.6.1.4.1.311.20.2",  // CertificateTemplateName
  subjectAltName: "2.5.29.17",
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
    rdn(OID.c, s.country ?? "SA"),
    rdn(OID.ou, s.organizationalUnit),
    rdn(OID.o, s.organizationName),
    rdn(OID.cn, s.commonName),
  ];
  if (s.serialNumber) rdns.push(rdn(OID.serial, s.serialNumber));
  return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, rdns);
}



/**
 * Build the ZATCA template name extension value.
 * This is a BMPString (UTF-16BE) encoding of "ZATCA-Code-Signing" or "PREZATCA-Code-Signing".
 */
function buildTemplateNameValue(templateName: string): string {
  // Encode as BMPString (UTF-16BE)
  let bmpString = "";
  for (let i = 0; i < templateName.length; i++) {
    const code = templateName.charCodeAt(i);
    bmpString += String.fromCharCode((code >> 8) & 0xff);
    bmpString += String.fromCharCode(code & 0xff);
  }
  return bmpString;
}

/**
 * Build CSR attributes including ZATCA-required extensions:
 * - CertificateTemplateName (OID 1.3.6.1.4.1.311.20.2) = "ZATCA-Code-Signing"
 * - SubjectAlternativeName with EGS serial, VAT, invoice type, location
 */
function buildAttributes(zatcaExt?: ZatcaExtensions) {
  if (!zatcaExt) {
    return asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, []);
  }

  const extensions: forge.asn1.Asn1[] = [];

  // Template name extension
  const templateValue = buildTemplateNameValue("ZATCA-Code-Signing");
  extensions.push(
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer(OID.templateName).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
        asn1.toDer(
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, false, templateValue),
        ).getBytes()),
    ]),
  );

  // SubjectAlternativeName extension
  if (zatcaExt.egsSerialNumber || zatcaExt.vatNumber) {
    extensions.push(
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
          asn1.oidToDer(OID.subjectAltName).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false,
          String.fromCharCode(0x00)),  // critical = false
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
          asn1.toDer(
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
              // directoryName [4]
              asn1.create(asn1.Class.CONTEXT_SPECIFIC, 4, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                  rdn(OID.serial, zatcaExt.egsSerialNumber ?? ""),
                  rdn(OID.ou, zatcaExt.vatNumber ?? ""),
                  rdn(OID.o, zatcaExt.invoiceType ?? "1100"),
                  rdn(OID.cn, zatcaExt.location ?? ""),
                  rdn(OID.c, zatcaExt.industryBusinessCategory ?? "Supply"),
                ]),
              ]),
            ]),
          ).getBytes()),
      ]),
    );
  }

  // Wrap extensions in the CSR attributes structure
  // attributes [0] { SEQUENCE { OID(extensionRequest), SET { SEQUENCE { extensions } } } }
  const extensionRequest = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
        asn1.oidToDer("1.2.840.113549.1.9.14").getBytes()),  // extensionRequest OID
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, extensions),
      ]),
    ]),
  ]);

  return extensionRequest;
}

/**
 * Build a PKCS#10 certificate-signing request for a secp256k1 key, signed with
 * ECDSA-SHA256. Returns a PEM string.
 *
 * When `zatcaExtensions` is provided, the CSR includes the ZATCA-required
 * custom OID (CertificateTemplateName) and SubjectAlternativeName carrying
 * EGS serial, VAT, invoice type, and location. These are mandatory — ZATCA
 * rejects CSRs without them.
 */
export function generateCsr(
  privateKeyPem: string,
  publicKeyPem: string,
  subject: CsrSubject,
  zatcaExtensions?: ZatcaExtensions,
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

  // attributes with ZATCA extensions
  const attributes = buildAttributes(zatcaExtensions);

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
