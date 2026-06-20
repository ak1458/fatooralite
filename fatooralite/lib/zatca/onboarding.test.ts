import { describe, it, expect, vi, afterEach } from "vitest";
import { requestComplianceCsid, requestProductionCsid, OnboardingError } from "./onboarding";

afterEach(() => vi.unstubAllGlobals());

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe("requestComplianceCsid", () => {
  it("maps the gateway response", async () => {
    mockFetch(200, { requestID: 123, binarySecurityToken: "TOKEN", secret: "SECRET" });
    const r = await requestComplianceCsid("Q1NS", "123456", "sandbox");
    expect(r.requestId).toBe("123");
    expect(r.token).toBe("TOKEN");
    expect(r.secret).toBe("SECRET");
  });
  it("throws on a non-2xx response", async () => {
    mockFetch(400, { errors: ["invalid OTP"] });
    await expect(requestComplianceCsid("Q1NS", "000000", "sandbox")).rejects.toBeInstanceOf(
      OnboardingError,
    );
  });
});

describe("requestProductionCsid", () => {
  it("maps the gateway response", async () => {
    mockFetch(200, { requestID: 999, binarySecurityToken: "PTOKEN", secret: "PSECRET" });
    const r = await requestProductionCsid(
      { token: "CT", secret: "CS", requestId: "123" },
      "sandbox",
    );
    expect(r.token).toBe("PTOKEN");
    expect(r.secret).toBe("PSECRET");
  });
});
