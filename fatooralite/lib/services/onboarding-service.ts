import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "@/lib/db/client";
import { generateKeyPair, generateCsr } from "@/lib/zatca/index";
import {
  requestComplianceCsid,
  requestProductionCsid,
} from "@/lib/zatca/onboarding";
import type { ZatcaMode } from "@/lib/zatca/client";

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
  const csrPem = generateCsr(kp.privateKeyPem, kp.publicKeyPem, {
    commonName,
    organizationName: company.name,
    organizationalUnit,
    serialNumber: company.vatNumber,
  });
  const csrBase64 = Buffer.from(csrPem, "utf8").toString("base64");

  const compliance = await requestComplianceCsid(csrBase64, otp, mode);

  const cert = await db.certificate.create({
    data: {
      companyId,
      kind: "compliance",
      status: "compliance",
      csrPem,
      privateKey: kp.privateKeyPem,
      publicKey: kp.publicKeyPem,
      token: compliance.token,
      secret: compliance.secret,
      requestId: compliance.requestId,
    },
  });

  return { certificateId: cert.id, requestId: compliance.requestId };
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
      privateKey: compliance.privateKey,
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
