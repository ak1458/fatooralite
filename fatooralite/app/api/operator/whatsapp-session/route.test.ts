// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

/**
 * Read-only WhatsApp provider/session health surface (2026-08-19, OpenWA
 * addition). Same OPERATOR_SECRET pattern as
 * app/api/operator/companies/route.test.ts (D7) — no tenant session,
 * however privileged, can reach this.
 */
vi.mock("@/lib/whatsapp/providers/openwa", () => ({
  getOpenWaSessionStatus: vi.fn(async () => ({ configured: true, available: true, status: "ready" })),
  // activeWhatsAppProvider() (lib/whatsapp/send.ts) also calls this to decide
  // whether OpenWA is the active provider at all — must mirror the real env-var
  // presence check the tests below set up, or provider selection never picks
  // OpenWA regardless of which env vars a given test sets.
  isOpenWaConfigured: vi.fn(
    () => Boolean(process.env.OPENWA_API_URL && process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID),
  ),
}));

const originalOperatorSecret = process.env.OPERATOR_SECRET;
const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.OPERATOR_SECRET;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_INVOICE_TEMPLATE_NAME;
  delete process.env.OPENWA_API_URL;
  delete process.env.OPENWA_API_KEY;
  delete process.env.OPENWA_SESSION_ID;
  delete process.env.WHATSAPP_PROVIDER;
});
afterEach(() => {
  process.env = { ...originalEnv };
  if (originalOperatorSecret === undefined) delete process.env.OPERATOR_SECRET;
  else process.env.OPERATOR_SECRET = originalOperatorSecret;
});

describe("GET /api/operator/whatsapp-session — authorization", () => {
  it("refuses when OPERATOR_SECRET is not configured at all", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/operator/whatsapp-session"));
    expect(res.status).toBe(403);
  });

  it("refuses a guessed/forged bearer token", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/whatsapp-session", {
        headers: { authorization: "Bearer guessed-value" },
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe("GET /api/operator/whatsapp-session — status reporting", () => {
  it("reports provider:null when neither Meta nor OpenWA is configured", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/whatsapp-session", {
        headers: { authorization: "Bearer real-operator-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ provider: null, configured: false, available: false });
  });

  it("reports OpenWA's session status (via the mocked provider) when OpenWA is the active provider", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    process.env.OPENWA_API_URL = "http://localhost:2785/api";
    process.env.OPENWA_API_KEY = "test-key";
    process.env.OPENWA_SESSION_ID = "session-abc";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/whatsapp-session", {
        headers: { authorization: "Bearer real-operator-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ provider: "openwa", configured: true, available: true, status: "ready" });
  });

  it("never returns the OpenWA API key or WhatsApp access token in the response body", async () => {
    process.env.OPERATOR_SECRET = "real-operator-secret";
    process.env.OPENWA_API_URL = "http://localhost:2785/api";
    process.env.OPENWA_API_KEY = "super-secret-openwa-key";
    process.env.OPENWA_SESSION_ID = "session-abc";
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/operator/whatsapp-session", {
        headers: { authorization: "Bearer real-operator-secret" },
      }),
    );
    const text = await res.text();
    expect(text).not.toContain("super-secret-openwa-key");
    expect(text).not.toContain("real-operator-secret");
  });
});
