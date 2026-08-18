// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Phase 2 / W4: the deep health check makes outbound calls on every hit
 * (ZATCA reachability), so it must never be reachable without a credential —
 * an unauthenticated endpoint like that is a free probing/amplification
 * primitive. It also must never leak a secret value in its response.
 */
const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => { process.env.CRON_SECRET = "deep-health-test-secret"; });
afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("GET /api/health/deep", () => {
  it("refuses a request with no bearer token", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/health/deep"));
    expect(res.status).toBe(401);
  });

  it("refuses a request with the wrong bearer token", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/health/deep", { headers: { authorization: "Bearer wrong-value" } }),
    );
    expect(res.status).toBe(401);
  });

  it("refuses everyone when CRON_SECRET is unset — fails closed, not open", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/health/deep", { headers: { authorization: "Bearer deep-health-test-secret" } }),
    );
    expect(res.status).toBe(401);
  });

  it("the response never contains the CRON_SECRET value, even on success", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/health/deep", { headers: { authorization: "Bearer deep-health-test-secret" } }),
    );
    const text = await res.text();
    expect(text).not.toContain("deep-health-test-secret");
  });
});
