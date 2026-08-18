import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { generateKeyPair, generateCsr, publicKeyDerBase64, generateSignedInvoice } from "@/lib/zatca/index";
import {
  requestComplianceCsid,
  requestProductionCsid,
  submitComplianceInvoice,
} from "@/lib/zatca/onboarding";
import type { ZatcaMode } from "@/lib/zatca/client";
import type { InvoiceInput } from "@/lib/zatca/types";
import { encryptPrivateKey, decryptPrivateKey, encryptSecret, decryptSecret } from "@/lib/crypto/encrypt";

export class OnboardingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingStateError";
  }
}

/**
 * Provision a LOCAL signing certificate so a company can issue (sign + QR + PDF)
 * invoices immediately, even before completing real ZATCA onboarding. This is a
 * self-managed EGS key pair stored as an active "production" certificate with a
 * placeholder CSID. It enables local/sandbox signing; real gateway clearance
 * still requires connecting to ZATCA (which replaces this with a real CSID).
 * Idempotent: returns the existing active cert if one is already present.
 */
export async function provisionLocalCertificate(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<{ certificateId: string; created: boolean }> {
  // Any active certificate means the company can already sign — a real ZATCA
  // CSID included, which must never be replaced by a local placeholder.
  const existing = await db.certificate.findFirst({
    where: { companyId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { certificateId: existing.id, created: false };

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new OnboardingStateError("Company not found");

  const kp = generateKeyPair();
  const csrPem = generateCsr(
    kp.privateKeyPem,
    kp.publicKeyPem,
    { commonName: "FatooraLite-Pro-EGS", organizationName: company.name, organizationalUnit: "Main", serialNumber: company.vatNumber },
    { egsSerialNumber: `EGS-${companyId}`, vatNumber: company.vatNumber, invoiceType: "1100", location: "Riyadh", industryBusinessCategory: "Supply" },
  );

  const cert = await db.certificate.create({
    data: {
      companyId,
      // "local", NOT "production". This is a self-signed key pair that has
      // never touched ZATCA. It was stored as "production", and every consumer
      // that asks for an active production certificate — the dashboard, the
      // clearance page, the integration panel, the AI insights — then reported
      // "Production CSID: Active" and "Gateway: Connected" to a tenant who had
      // not onboarded at all. For a compliance product that is not a cosmetic
      // mislabel: it tells a business it is filing with the tax authority when
      // it is not. getActiveCertificate() selects on status, not kind, so
      // signing still works with this.
      kind: "local",
      status: "active",
      csrPem,
      privateKey: encryptPrivateKey(kp.privateKeyPem),
      publicKey: kp.publicKeyPem,
      // Local placeholder CSID — valid base64 so the XAdES cert digest computes;
      // replaced by a real binarySecurityToken when ZATCA onboarding runs.
      token: publicKeyDerBase64(kp.publicKeyPem),
      secret: encryptSecret("LOCAL-DEV-SECRET"),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      serial: "LOCAL-DEV",
    },
  });
  return { certificateId: cert.id, created: true };
}

export interface StartOnboardingArgs {
  companyId: string;
  otp: string;
  commonName: string;
  organizationalUnit: string;
  mode?: ZatcaMode;
}

/**
 * Step 1: generate the EGS key pair + CSR and exchange the CSR + portal OTP for
 * a Compliance CSID. Stores a "compliance" certificate row.
 */
export async function startOnboarding(
  { companyId, otp, commonName, organizationalUnit, mode = "sandbox" }: StartOnboardingArgs,
  db: PrismaClient = defaultDb,
) {
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new OnboardingStateError("Company not found");

  const kp = generateKeyPair();
  const csrPem = generateCsr(
    kp.privateKeyPem,
    kp.publicKeyPem,
    {
      commonName,
      organizationName: company.name,
      organizationalUnit,
      serialNumber: company.vatNumber,
    },
    {
      egsSerialNumber: `EGS-${companyId}`,
      vatNumber: company.vatNumber,
      invoiceType: "1100", // Standard and Simplified
      location: "Riyadh",
      industryBusinessCategory: "Supply",
    }
  );
  const csrBase64 = Buffer.from(csrPem, "utf8").toString("base64");

  const compliance = await requestComplianceCsid(csrBase64, otp, mode);

  const cert = await db.certificate.create({
    data: {
      companyId,
      kind: "compliance",
      status: "compliance",
      csrPem,
      privateKey: encryptPrivateKey(kp.privateKeyPem),
      publicKey: kp.publicKeyPem,
      token: compliance.token,
      secret: encryptSecret(compliance.secret),
      requestId: compliance.requestId,
    },
  });

  return { certificateId: cert.id, requestId: compliance.requestId };
}

/**
 * Whether the company already has a usable compliance certificate (CCSID
 * issued, not yet consumed into a production CSID). Used by the single-call
 * /api/onboarding/activate orchestration to skip startOnboarding on retry —
 * the portal OTP is single-use, so re-requesting a CCSID when one is already
 * stored would needlessly burn a fresh OTP for no reason.
 */
export async function hasResumableComplianceCertificate(
  companyId: string,
  db: PrismaClient = defaultDb,
): Promise<boolean> {
  const compliance = await db.certificate.findFirst({
    where: { companyId, kind: "compliance", status: "compliance" },
    select: { id: true },
  });
  return !!compliance;
}

export interface ComplianceCheckOutcome {
  success: boolean;
  results: {
    label: string;
    status: "PASS" | "FAIL";
    reportingStatus?: string;
    clearanceStatus?: string;
  }[];
}

/**
 * Step 1.5: Run the mandatory ZATCA compliance checks — generate the sample
 * documents (standard invoice, simplified invoice, credit note, debit note),
 * sign each with the compliance CSID key, and submit them to the gateway's
 * compliance endpoint. Production CSID issuance is gated on all four passing.
 */
export async function runComplianceChecks(
  companyId: string,
  mode: ZatcaMode = "sandbox",
  db: PrismaClient = defaultDb,
): Promise<ComplianceCheckOutcome> {
  const compliance = await db.certificate.findFirst({
    where: { companyId, kind: "compliance", status: "compliance" },
    orderBy: { createdAt: "desc" },
  });
  if (!compliance?.token || !compliance.secret || !compliance.privateKey || !compliance.publicKey) {
    throw new OnboardingStateError("Run startOnboarding first");
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new OnboardingStateError("Company not found");

  const keyPair = {
    privateKeyPem: decryptPrivateKey(compliance.privateKey),
    publicKeyPem: compliance.publicKey,
  };

  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const issueDate = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const issueTime = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

  const seller = { name: company.name, vatNumber: company.vatNumber };
  // ZATCA's documented sample buyer VAT for compliance checks.
  const buyer = { name: "Compliance Check Buyer", vatNumber: "399999999800003" };
  const line = [{ description: "Compliance check item", quantity: 1, unitPrice: 100 }];
  const base = { issueDate, issueTime, seller, lines: line, icv: 1 };

  const samples: { label: string; input: InvoiceInput }[] = [
    { label: "standard", input: { ...base, invoiceNumber: "CHK-STD-1", kind: "standard", buyer } },
    { label: "simplified", input: { ...base, invoiceNumber: "CHK-SIM-1", kind: "simplified" } },
    {
      label: "credit",
      input: {
        ...base, invoiceNumber: "CHK-CRN-1", kind: "standard", buyer,
        documentType: "credit", billingReferenceId: "CHK-STD-1", instructionNote: "Compliance check credit note",
      },
    },
    {
      label: "debit",
      input: {
        ...base, invoiceNumber: "CHK-DBN-1", kind: "standard", buyer,
        documentType: "debit", billingReferenceId: "CHK-STD-1", instructionNote: "Compliance check debit note",
      },
    },
  ];

  const results: ComplianceCheckOutcome["results"] = [];
  for (const sample of samples) {
    const signed = generateSignedInvoice(sample.input, keyPair, {
      certificateBase64: compliance.token,
    });
    const res = await submitComplianceInvoice(
      {
        signedXmlBase64: Buffer.from(signed.xml, "utf8").toString("base64"),
        invoiceHash: signed.hash,
        uuid: signed.uuid,
      },
      { token: compliance.token, secret: decryptSecret(compliance.secret)! },
      mode,
    );
    results.push({
      label: sample.label,
      status: res.status,
      reportingStatus: res.reportingStatus,
      clearanceStatus: res.clearanceStatus,
    });
  }

  return { success: results.every((r) => r.status === "PASS"), results };
}

/**
 * Step 2: request the Production CSID using the stored compliance credentials,
 * then store an active "production" certificate (reusing the EGS key pair).
 */
export async function completeOnboarding(
  companyId: string,
  mode: ZatcaMode = "sandbox",
  db: PrismaClient = defaultDb,
) {
  const compliance = await db.certificate.findFirst({
    where: { companyId, kind: "compliance", status: "compliance" },
    orderBy: { createdAt: "desc" },
  });
  if (!compliance || !compliance.token || !compliance.secret || !compliance.requestId) {
    throw new OnboardingStateError("Run compliance onboarding first");
  }

  // ZATCA gates production CSIDs on passing the compliance checks; run them
  // here so a failed sample surfaces as a clear error instead of a gateway 400.
  const checks = await runComplianceChecks(companyId, mode, db);
  if (!checks.success) {
    const failed = checks.results.filter((r) => r.status === "FAIL").map((r) => r.label);
    throw new OnboardingStateError(
      `Compliance checks failed for: ${failed.join(", ")}. Fix and retry before requesting a production CSID.`,
    );
  }

  const production = await requestProductionCsid(
    { token: compliance.token, secret: decryptSecret(compliance.secret)!, requestId: compliance.requestId },
    mode,
  );

  // Deactivate any previous production certificate, then store the new one.
  await db.certificate.updateMany({
    where: { companyId, kind: "production", status: "active" },
    data: { status: "expired" },
  });

  const cert = await db.certificate.create({
    data: {
      companyId,
      kind: "production",
      status: "active",
      privateKey: compliance.privateKey, // already encrypted in the compliance record
      publicKey: compliance.publicKey,
      token: production.token,
      secret: encryptSecret(production.secret),
      requestId: production.requestId,
      issuedAt: new Date(),
    },
  });

  await db.certificate.update({ where: { id: compliance.id }, data: { status: "used" } });

  return { certificateId: cert.id };
}
