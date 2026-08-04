import type { APIRequestContext, Page } from "@playwright/test";

/** Unique-per-run test tenant. */
export function freshAccount() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: "E2E Owner",
    email: `e2e-${stamp}@example.test`,
    password: "e2e-password-123",
    companyName: `E2E Co ${stamp}`,
    // 15 digits, ZATCA-shaped (3...3)
    vatNumber: `3${stamp.slice(-13).padStart(13, "0")}3`,
    acceptedTerms: true,
  };
}

/** Register a company + owner through the API; the response sets the session cookie. */
export async function registerViaApi(request: APIRequestContext) {
  const account = freshAccount();
  const res = await request.post("/api/auth/register", { data: account });
  if (res.status() !== 201) {
    throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  }
  return account;
}

/** Register through the page's request context so the browser inherits the session. */
export async function registerAndSignIn(page: Page) {
  return registerViaApi(page.request);
}
