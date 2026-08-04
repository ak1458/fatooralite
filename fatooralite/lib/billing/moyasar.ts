import { timingSafeEqual } from "node:crypto";

/**
 * Moyasar (moyasar.com) — KSA payment gateway. Integration uses the hosted
 * Invoices API (POST /invoices returns a checkout.moyasar.com URL) rather
 * than the raw Payments API with card fields, so this app never touches or
 * stores a card number (keeps us out of PCI scope entirely).
 *
 * NOT independently verified against a live Moyasar account — written from
 * https://docs.moyasar.com (fetched 2026-07-21) with no test account
 * available at the time. The invoice-webhook payload shape in particular
 * was ambiguous in the docs (the generic webhook-subscription system's
 * payload is clearly {id, type, created_at, secret_token, data}, but the
 * Invoices API's own callback_url note only says "a POST request with the
 * invoice object" — could be that same envelope or the invoice object
 * directly). parseInvoiceWebhook() and verifyWebhookSecret() below handle
 * both shapes defensively, but this MUST be confirmed against one real test
 * transaction (Moyasar's sandbox mode) before relying on it for live money.
 */

const MOYASAR_API_BASE = "https://api.moyasar.com";

export function isMoyasarConfigured(): boolean {
  return Boolean(process.env.MOYASAR_SECRET_KEY);
}

export interface CreateInvoiceInput {
  amountHalalas: number;
  description: string;
  successUrl: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export interface MoyasarInvoice {
  id: string;
  status: string;
  url: string;
}

/** POST /invoices — creates a hosted checkout page; returns its URL to redirect the payer to. */
export async function createCheckoutInvoice(input: CreateInvoiceInput): Promise<MoyasarInvoice> {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY not configured");

  const res = await fetch(`${MOYASAR_API_BASE}/invoices`, {
    method: "POST",
    // Moyasar authenticates via HTTP Basic Auth: secret key as username, no password.
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: input.amountHalalas,
      currency: "SAR",
      description: input.description,
      success_url: input.successUrl,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
  if (!res.ok) {
    throw new Error(`Moyasar invoice creation failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; status: string; url: string };
  return { id: data.id, status: data.status, url: data.url };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Length must match for timingSafeEqual; padding both to the longer
  // length keeps the comparison itself constant-time while still failing
  // closed on a length mismatch (this is a shared-secret compare, not a
  // signature over attacker-chosen content, so the marginal length-timing
  // leak here is not a meaningful threat).
  const len = Math.max(bufA.length, bufB.length, 1);
  const padA = Buffer.alloc(len);
  const padB = Buffer.alloc(len);
  bufA.copy(padA);
  bufB.copy(padB);
  return bufA.length === bufB.length && timingSafeEqual(padA, padB);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** The secret_token may be top-level or nested under `data`, depending on which envelope Moyasar sends — see the file header. */
function extractSecretToken(payload: unknown): string | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  if (typeof obj.secret_token === "string") return obj.secret_token;
  const data = asRecord(obj.data);
  return typeof data?.secret_token === "string" ? data.secret_token : null;
}

/**
 * Verify a webhook notification actually came from our configured Moyasar
 * endpoint. Moyasar embeds the dashboard-configured shared secret directly
 * in the notification body as `secret_token` (not an HMAC signature over
 * the payload), so verification is a constant-time string comparison.
 */
export function verifyWebhookSecret(payload: unknown): boolean {
  const configured = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!configured) return false;
  const token = extractSecretToken(payload);
  return token !== null && timingSafeEqualStr(token, configured);
}

export interface ParsedInvoiceEvent {
  invoiceId: string;
  status: string;
  companyId: string | null;
}

/** Extracts {id, status, metadata.companyId} from either envelope shape (see file header). Returns null if the payload doesn't look like an invoice at all. */
export function parseInvoiceWebhook(payload: unknown): ParsedInvoiceEvent | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  const invoice = asRecord(obj.data) ?? obj;
  const id = invoice.id;
  const status = invoice.status;
  if (typeof id !== "string" || typeof status !== "string") return null;
  const metadata = asRecord(invoice.metadata);
  const companyId = metadata && typeof metadata.companyId === "string" ? metadata.companyId : null;
  return { invoiceId: id, status, companyId };
}
