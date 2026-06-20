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
 * Step 2 — after passing compliance checks, request the Production CSID.
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
