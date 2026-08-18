// @vitest-environment node
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { REQUEST_ID_HEADER } from "@/lib/log/request-id";

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
