// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { REQUEST_ID_HEADER } from "@/lib/log/request-id";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Phase 2 / W4: every response the proxy touches carries a correlation id,
 * minted server-side, so USER ACTION -> REQUEST -> ... -> RESULT can be
 * traced without asking the caller to have kept anything themselves.
 */
describe("proxy — correlation id", () => {
  it("stamps a request id on a public-route response", async () => {
    const req = new NextRequest(new Request("http://localhost/login"));
    const res = await proxy(req);
    expect(res.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("stamps a request id on an unauthenticated API 401", async () => {
    const req = new NextRequest(new Request("http://localhost/api/invoices"));
    const res = await proxy(req);
    expect(res.status).toBe(401);
    expect(res.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("mints a different id per request — never reused, never client-controlled", async () => {
    const forged = new NextRequest(
      new Request("http://localhost/login", { headers: { [REQUEST_ID_HEADER]: "attacker-supplied-value" } }),
    );
    const res = await proxy(forged);
    expect(res.headers.get(REQUEST_ID_HEADER)).not.toBe("attacker-supplied-value");

    const res2 = await proxy(new NextRequest(new Request("http://localhost/login")));
    expect(res.headers.get(REQUEST_ID_HEADER)).not.toBe(res2.headers.get(REQUEST_ID_HEADER));
  });

  it("forwards the request id to the app so route handlers can read it", async () => {
    const req = new NextRequest(new Request("http://localhost/login"));
    const res = await proxy(req);
    // NextResponse.next() carries the rewritten request headers on this response header.
    const forwarded = res.headers.get("x-middleware-request-" + REQUEST_ID_HEADER);
    expect(forwarded).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("proxy — invalid UTF-8 in a URL (F-16 regression)", () => {
  // Reconfirmed live (W26, 2026-08-18) against next dev 16.3.0: none of these
  // 500 — each gets the ordinary auth-gate response, with a stamped
  // x-request-id proving the proxy actually ran. The original audit found a
  // framework-level 500 "before application code runs"; that no longer
  // reproduces, most likely because of the Next.js version upgrade done for
  // Phase 1's security work. This test locks the current (safe) behaviour in.
  const malformed = ["%ff%fe", "%e0%80%af", "%ff", "%c0%af", "%ed%a0%80", "%f8%88%80%80%80"];

  it.each(malformed)("never 500s on /%s", async (seq) => {
    const req = new NextRequest(new Request(`http://localhost/${seq}`));
    const res = await proxy(req);
    expect(res.status).not.toBe(500);
    expect(res.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("proxy — Origin required on state-changing requests (W21, closes F-12)", () => {
  it("refuses a cookie-authed POST with neither Origin nor Referer (the F-12 reproduction)", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=anything` },
      }),
    );
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it("proceeds to the auth gate when Origin matches Host (garbage token still 401s)", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=anything`, origin: "http://localhost", host: "localhost" },
      }),
    );
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it("still refuses a cookie-authed POST when Origin is present but mismatched", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE}=anything`, origin: "http://evil.example" },
      }),
    );
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it("exempts a cookie-less POST (machine client) — falls through to a 401, not 403", async () => {
    const req = new NextRequest(new Request("http://localhost/api/invoices", { method: "POST" }));
    const res = await proxy(req);
    expect(res.status).toBe(401);
  });

  it("exempts the billing webhook — no session cookie, no Origin", async () => {
    const req = new NextRequest(new Request("http://localhost/api/billing/webhook", { method: "POST" }));
    const res = await proxy(req);
    expect(res.status).not.toBe(403);
  });

  it("does not apply the Origin requirement to GET requests", async () => {
    const req = new NextRequest(
      new Request("http://localhost/api/invoices", {
        method: "GET",
        headers: { cookie: `${SESSION_COOKIE}=anything` },
      }),
    );
    const res = await proxy(req);
    expect(res.status).not.toBe(403);
  });
});

describe("proxy — operator surfaces reach their own bearer-token check (found live 2026-08-19)", () => {
  it("does not intercept /api/operator/companies with a generic 401 — no session cookie needed", async () => {
    const req = new NextRequest(new Request("http://localhost/api/operator/companies"));
    const res = await proxy(req);
    // "not 401 from the proxy" is the property that matters: the route
    // itself still 403s with no Authorization header, but that must come
    // from lib/audit/events.ts's own check, not this gate.
    expect(res.status).not.toBe(401);
  });

  it("does not intercept /api/operator/whatsapp-session with a generic 401 — no session cookie needed", async () => {
    const req = new NextRequest(new Request("http://localhost/api/operator/whatsapp-session"));
    const res = await proxy(req);
    expect(res.status).not.toBe(401);
  });
});
