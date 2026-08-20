// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hasTestDb } from "@/lib/db/test-db";

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

describe("GET /api/health/deep — auth gate (no DB needed)", () => {
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
});

/**
 * Found in CI (2026-08-20): unlike every other DB-touching test in this
 * codebase, these two previously ran unconditionally — they passed locally
 * only because a real DATABASE_URL was always configured, and there was no
 * describe.skipIf(!hasTestDb) gate to fall back on when there wasn't one.
 * CI's DATABASE_URL is an intentional non-connecting placeholder (see
 * .github/workflows/ci.yml), so getJobStats()'s real db.invoice.count()
 * call failed outright with ECONNREFUSED to localhost:5432 — a genuine gap
 * in this file, not a flake and not caused by anything else in this PR.
 * Gated the same way the rest of the suite gates a real DB dependency.
 */
describe.skipIf(!hasTestDb)("GET /api/health/deep — success path (needs a real DB)", () => {
  // This is the first test in the file to reach the route's real work —
  // outbound ZATCA reachability plus a DB job-stats query, both paying a
  // one-time connection/TLS cold-start cost that the next test (reusing
  // warm connections) doesn't. Reproduced deterministically (2/2, both in
  // isolation and inside the full-suite batch) as exactly this test timing
  // out at the 5s default while the next test's identical call succeeds —
  // measured, not assumed, and the same class of Neon/network cold-start
  // latency already documented for this programme
  // (docs/SESSION_HANDOFF_2026-08-18.md §3.5's plan.test.ts case; this
  // session's app/api/invoices/[id]/whatsapp/route.test.ts hit the
  // identical signature). Not a logic defect in this route.
  it("the response never contains the CRON_SECRET value, even on success", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/health/deep", { headers: { authorization: "Bearer deep-health-test-secret" } }),
    );
    const text = await res.text();
    expect(text).not.toContain("deep-health-test-secret");
  }, 20_000);

  it("reports background-job visibility (W8) alongside dependency health", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/health/deep", { headers: { authorization: "Bearer deep-health-test-secret" } }),
    );
    const data = await res.json();
    expect(data.jobs).toMatchObject({
      reportingPending: expect.any(Number),
      reportingOverdue: expect.any(Number),
      reportingFailed: expect.any(Number),
      submittedStale: expect.any(Number),
      needsReview: expect.any(Number),
    });
  }, 20_000);
});
