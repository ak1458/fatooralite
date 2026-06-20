import type { InvoiceInput } from "./types";
import { validateInvoice } from "./validate";

export type ZatcaMode = "sandbox" | "production";
export type ZatcaAction = "clearance" | "reporting";
export type ZatcaStatus = "accepted" | "rejected" | "warning";

export interface ZatcaResponse {
  action: ZatcaAction;
  status: ZatcaStatus;
  code: string;
  message: string;
  clearedInvoiceBase64?: string; // ZATCA returns the cleared (re-stamped) XML
  raw: string;
}

export interface SubmitArgs {
  input: InvoiceInput;
  uuid: string;
  signedXmlBase64: string;
  hash: string;
}

/** Production-CSID credentials used to authenticate gateway calls. */
export interface ZatcaCredentials {
  /** base64 of the binary security token (the production CSID certificate). */
  token: string;
  /** the production CSID secret. */
  secret: string;
}

/** Anything that can submit an invoice — lets services be tested with a stub. */
export interface ZatcaSubmitter {
  actionFor(kind: InvoiceInput["kind"]): ZatcaAction;
  submit(args: SubmitArgs): Promise<ZatcaResponse>;
}

export function gatewayBaseUrl(mode: ZatcaMode): string {
  if (mode === "production") {
    return (
      process.env.ZATCA_PRODUCTION_BASE_URL ??
      "https://gw-fatoora.zatca.gov.sa/e-invoicing/core"
    );
  }
  return (
    process.env.ZATCA_SANDBOX_BASE_URL ??
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal"
  );
}

export class MissingCredentialsError extends Error {
  constructor() {
    super("ZATCA production credentials are required to submit invoices");
    this.name = "MissingCredentialsError";
  }
}

/**
 * Real ZATCA Fatoora gateway client.
 * - standard invoices are *cleared*, simplified are *reported*.
 * - a local BR-KSA validation runs first so obviously-invalid invoices are
 *   rejected before a network call.
 * Requires production-CSID credentials (obtained via onboarding).
 */
export class ZatcaClient implements ZatcaSubmitter {
  private readonly mode: ZatcaMode;
  private readonly credentials?: ZatcaCredentials;

  constructor(
    credentials?: ZatcaCredentials,
    mode: ZatcaMode = (process.env.ZATCA_MODE as ZatcaMode) ?? "sandbox",
  ) {
    this.credentials = credentials;
    this.mode = mode === "production" ? "production" : "sandbox";
  }

  actionFor(kind: InvoiceInput["kind"]): ZatcaAction {
    return kind === "standard" ? "clearance" : "reporting";
  }

  async submit(args: SubmitArgs): Promise<ZatcaResponse> {
    const action = this.actionFor(args.input.kind);

    const issue = validateInvoice(args.input);
    if (issue) {
      return {
        action,
        status: "rejected",
        code: issue.code,
        message: issue.message,
        raw: JSON.stringify({ status: "rejected", ...issue }),
      };
    }

    if (!this.credentials) throw new MissingCredentialsError();

    const base = gatewayBaseUrl(this.mode);
    const path =
      action === "clearance" ? "/invoices/clearance/single" : "/invoices/reporting/single";
    const auth = Buffer.from(`${this.credentials.token}:${this.credentials.secret}`).toString(
      "base64",
    );

    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        ...(action === "clearance" ? { "Clearance-Status": "1" } : {}),
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        invoiceHash: args.hash,
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
    const accepted = res.ok && reported !== "NOT_REPORTED" && reported !== "NOT_CLEARED";

    return {
      action,
      status: accepted ? "accepted" : "rejected",
      code: String(reported ?? res.status),
      message: accepted ? "Accepted by ZATCA" : "Rejected by ZATCA",
      clearedInvoiceBase64:
        typeof parsed.clearedInvoice === "string" ? parsed.clearedInvoice : undefined,
      raw,
    };
  }
}
