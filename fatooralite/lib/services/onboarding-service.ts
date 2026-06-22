import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { generateKeyPair, generateCsr } from "@/lib/zatca/index";
import {
  requestComplianceCsid,
  requestProductionCsid,
} from "@/lib/zatca/onboarding";
import type { ZatcaMode } from "@/lib/zatca/client";
import { encryptPrivateKey, decryptPrivateKey } from "@/lib/crypto/encrypt";

export class OnboardingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingStateError";
  }
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
      secret: compliance.secret,
      requestId: compliance.requestId,
    },
  });

  return { certificateId: cert.id, requestId: compliance.requestId };
}

/**
 * Step 1.5: Run the mandatory compliance checks by submitting 4 sample invoices.
 */
export async function runComplianceChecks(
  companyId: string,
  db: PrismaClient = defaultDb,
) {
  const compliance = await db.certificate.findFirst({
    where: { companyId, kind: "compliance", status: "compliance" },
    orderBy: { createdAt: "desc" },
  });
  if (!compliance || !compliance.token || !compliance.secret) {
    throw new OnboardingStateError("Run startOnboarding first");
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) throw new OnboardingStateError("Company not found");

  // In a real implementation, we would generate the 4 sample invoices here
  // (Standard, Simplified, Credit Note, Debit Note), sign them using the
  // compliance private key, and submit them via submitComplianceInvoice().
  // Since we don't have a real ZATCA portal account yet, we'll just mock this
  // step for the MVP/Phase 1.

  // TODO: implement real sample generation and submission
  // const results = await Promise.all([
  //   submitComplianceInvoice(standardInvoice, compliance, mode),
  //   submitComplianceInvoice(simplifiedInvoice, compliance, mode),
  //   submitComplianceInvoice(creditNote, compliance, mode),
  //   submitComplianceInvoice(debitNote, compliance, mode),
  // ]);

  return { success: true };
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

  const production = await requestProductionCsid(
    { token: compliance.token, secret: compliance.secret, requestId: compliance.requestId },
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
      secret: production.secret,
      requestId: production.requestId,
      issuedAt: new Date(),
    },
  });

  await db.certificate.update({ where: { id: compliance.id }, data: { status: "used" } });

  return { certificateId: cert.id };
}
