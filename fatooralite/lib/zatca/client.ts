import type { InvoiceInput } from "./types";
import { validateInvoice } from "./validate";

export type ZatcaMode = "simulation" | "sandbox" | "production";
export type ZatcaAction = "clearance" | "reporting";
export type ZatcaStatus = "accepted" | "rejected" | "warning";

export interface ZatcaResponse {
  action: ZatcaAction;
  status: ZatcaStatus;
  code: string;
  message: string;
  icv?: number; // invoice counter value (cleared invoices)
  raw: string; // raw JSON the gateway returned (or the simulated equivalent)
}

export interface SubmitArgs {
  input: InvoiceInput;
  signedXmlBase64: string;
  hash: string;
}

const BASE_URLS: Record<Exclude<ZatcaMode, "simulation">, string> = {
  sandbox:
    process.env.ZATCA_SANDBOX_BASE_URL ??
    "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  production: process.env.ZATCA_PRODUCTION_BASE_URL ?? "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

/**
 * Client for the ZATCA Fatoora gateway.
 * - `simulation` (default): validates locally and returns a deterministic
 *   accepted/rejected response — no network, perfect for demos and tests.
 * - `sandbox` / `production`: POST the signed invoice to the real gateway.
 *   Requires a real CSID/credentials (passed via auth header).
 */
export class ZatcaClient {
  constructor(
    private readonly mode: ZatcaMode = (process.env.ZATCA_MODE as ZatcaMode) ?? "simulation",
    private readonly auth?: string,
  ) {}

  /** Standard invoices are *cleared*; simplified are *reported*. */
  actionFor(kind: InvoiceInput["kind"]): ZatcaAction {
    return kind === "standard" ? "clearance" : "reporting";
  }

  async submit(args: SubmitArgs): Promise<ZatcaResponse> {
    const action = this.actionFor(args.input.kind);
    if (this.mode === "simulation") return this.simulate(action, args);
    return this.callGateway(action, args);
  }

  private simulate(action: ZatcaAction, args: SubmitArgs): ZatcaResponse {
    const issue = validateInvoice(args.input);
    if (issue) {
      return {
        action,
        status: "rejected",
        code: issue.code,
        message: issue.message,
        raw: JSON.stringify({ simulated: true, status: "rejected", ...issue }),
      };
    }
    const icv = Math.floor(1000 + Math.random() * 9000);
    return {
      action,
      status: "accepted",
      code: action === "clearance" ? "CLEARED" : "REPORTED",
      message: action === "clearance" ? "Invoice cleared" : "Invoice reported",
      icv,
      raw: JSON.stringify({ simulated: true, status: "accepted", icv }),
    };
  }

  private async callGateway(action: ZatcaAction, args: SubmitArgs): Promise<ZatcaResponse> {
    const base = BASE_URLS[this.mode as Exclude<ZatcaMode, "simulation">];
    const path = action === "clearance" ? "/invoices/clearance/single" : "/invoices/reporting/single";
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Version": "V2",
        ...(this.auth ? { Authorization: this.auth } : {}),
      },
      body: JSON.stringify({ invoiceHash: args.hash, invoice: args.signedXmlBase64 }),
    });
    const raw = await res.text();
    const status: ZatcaStatus = res.ok ? "accepted" : "rejected";
    return {
      action,
      status,
      code: String(res.status),
      message: res.ok ? "Submitted to ZATCA" : "Gateway rejected the invoice",
      raw,
    };
  }
}
