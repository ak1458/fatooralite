import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isMoyasarConfigured, verifyWebhookSecret, parseInvoiceWebhook } from "./moyasar";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.MOYASAR_SECRET_KEY;
  delete process.env.MOYASAR_WEBHOOK_SECRET;
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isMoyasarConfigured", () => {
  it("false when MOYASAR_SECRET_KEY is unset (the ship-live-now-without-Moyasar default)", () => {
    expect(isMoyasarConfigured()).toBe(false);
  });
  it("true once MOYASAR_SECRET_KEY is set", () => {
    process.env.MOYASAR_SECRET_KEY = "sk_test_x";
    expect(isMoyasarConfigured()).toBe(true);
  });
});

describe("verifyWebhookSecret", () => {
  it("denies when MOYASAR_WEBHOOK_SECRET is not configured, even with a matching-looking payload", () => {
    expect(verifyWebhookSecret({ secret_token: "anything" })).toBe(false);
  });

  it("accepts a top-level secret_token matching the configured secret", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "whsec_abc123";
    expect(verifyWebhookSecret({ secret_token: "whsec_abc123" })).toBe(true);
  });

  it("accepts a secret_token nested under data (the other possible envelope shape)", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "whsec_abc123";
    expect(verifyWebhookSecret({ data: { secret_token: "whsec_abc123" } })).toBe(true);
  });

  it("rejects a mismatched secret_token", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "whsec_abc123";
    expect(verifyWebhookSecret({ secret_token: "whsec_wrong" })).toBe(false);
  });

  it("rejects a payload with no secret_token at all", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "whsec_abc123";
    expect(verifyWebhookSecret({ id: "inv_1", status: "paid" })).toBe(false);
  });

  it("rejects malformed payloads without throwing", () => {
    process.env.MOYASAR_WEBHOOK_SECRET = "whsec_abc123";
    expect(verifyWebhookSecret(null)).toBe(false);
    expect(verifyWebhookSecret("a string")).toBe(false);
    expect(verifyWebhookSecret(42)).toBe(false);
  });
});

describe("parseInvoiceWebhook", () => {
  it("parses a direct invoice object (id/status/metadata at top level)", () => {
    const parsed = parseInvoiceWebhook({ id: "inv_1", status: "paid", metadata: { companyId: "co_1" } });
    expect(parsed).toEqual({ invoiceId: "inv_1", status: "paid", companyId: "co_1" });
  });

  it("parses an enveloped invoice object (id/status/metadata under data)", () => {
    const parsed = parseInvoiceWebhook({
      type: "invoice_paid",
      data: { id: "inv_2", status: "paid", metadata: { companyId: "co_2" } },
    });
    expect(parsed).toEqual({ invoiceId: "inv_2", status: "paid", companyId: "co_2" });
  });

  it("returns companyId: null when metadata is missing (webhook route treats this as a rejectable error)", () => {
    expect(parseInvoiceWebhook({ id: "inv_3", status: "paid" })).toEqual({
      invoiceId: "inv_3",
      status: "paid",
      companyId: null,
    });
  });

  it("returns null when the payload has no recognizable id/status", () => {
    expect(parseInvoiceWebhook({ foo: "bar" })).toBeNull();
    expect(parseInvoiceWebhook(null)).toBeNull();
    expect(parseInvoiceWebhook("not an object")).toBeNull();
  });
});
