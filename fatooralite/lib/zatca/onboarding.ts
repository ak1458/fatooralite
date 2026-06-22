import type { ZatcaMode } from "./client";
import { gatewayBaseUrl } from "./client";

export interface ComplianceCsidResult {
  requestId: string;
  token: string; // binarySecurityToken (compliance CSID certificate, base64)
  secret: string;
  raw: string;
}

export interface ProductionCsidResult {
  requestId: string;
  token: string; // production CSID certificate (base64)
  secret: string;
  raw: string;
}

export interface ComplianceCheckResult {
  status: "PASS" | "FAIL";
  reportingStatus?: string;
  clearanceStatus?: string;
  raw: string;
}

export class OnboardingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly raw: string,
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}

/**
 * Step 1 — exchange a CSR + portal OTP for a Compliance CSID.
 * POST {base}/compliance  (header OTP, body { csr }).
 */
export async function requestComplianceCsid(
  csrBase64: string,
  otp: string,
  mode: ZatcaMode = "sandbox",
): Promise<ComplianceCsidResult> {
  const res = await fetch(`${gatewayBaseUrl(mode)}/compliance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Version": "V2",
      OTP: otp,
    },
    body: JSON.stringify({ csr: csrBase64 }),
  });
  const raw = await res.text();
  if (!res.ok) throw new OnboardingError("Compliance CSID request failed", res.status, raw);
  const data = JSON.parse(raw) as { requestID?: string; binarySecurityToken: string; secret: string };
  return {
    requestId: String(data.requestID ?? ""),
    token: data.binarySecurityToken,
    secret: data.secret,
    raw,
  };
}

/**
 * Step 2 — submit a compliance invoice (ZATCA requires passing these checks
 * before issuing a production CSID).
 *
 * You must submit sample invoices (standard, simplified, credit note, debit note)
 * to the compliance/invoices endpoint using the compliance CSID as authentication.
 *
 * POST {base}/compliance/invoices  (Basic auth with compliance CSID).
 */
export async function submitComplianceInvoice(
  args: {
    signedXmlBase64: string;
    invoiceHash: string;
    uuid: string;
  },
  compliance: { token: string; secret: string },
  mode: ZatcaMode = "sandbox",
): Promise<ComplianceCheckResult> {
  const auth = Buffer.from(`${compliance.token}:${compliance.secret}`).toString("base64");
  const res = await fetch(`${gatewayBaseUrl(mode)}/compliance/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Version": "V2",
      "Accept-Language": "en",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      invoiceHash: args.invoiceHash,
      uuid: args.uuid,
      invoice: args.signedXmlBase64,
    }),
  });

  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* gateway returned non-JSON */
  }

  const reported = (parsed.reportingStatus ?? parsed.clearanceStatus) as string | undefined;
  const passed = res.ok && reported !== "NOT_REPORTED" && reported !== "NOT_CLEARED";

  return {
    status: passed ? "PASS" : "FAIL",
    reportingStatus: parsed.reportingStatus as string | undefined,
    clearanceStatus: parsed.clearanceStatus as string | undefined,
    raw,
  };
}

/**
 * Step 3 — after passing compliance checks, request the Production CSID.
 * POST {base}/production/csids  (Basic auth with the compliance CSID,
 * body { compliance_request_id }).
 */
export async function requestProductionCsid(
  compliance: { token: string; secret: string; requestId: string },
  mode: ZatcaMode = "sandbox",
): Promise<ProductionCsidResult> {
  const auth = Buffer.from(`${compliance.token}:${compliance.secret}`).toString("base64");
  const res = await fetch(`${gatewayBaseUrl(mode)}/production/csids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Version": "V2",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ compliance_request_id: compliance.requestId }),
  });
  const raw = await res.text();
  if (!res.ok) throw new OnboardingError("Production CSID request failed", res.status, raw);
  const data = JSON.parse(raw) as { requestID?: string; binarySecurityToken: string; secret: string };
  return {
    requestId: String(data.requestID ?? ""),
    token: data.binarySecurityToken,
    secret: data.secret,
    raw,
  };
}
