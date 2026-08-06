import { test, expect } from "@playwright/test";
import { registerAndSignIn } from "./helpers";

// A brand-new product starts EMPTY: no demo users, no seed. Every test creates
// its own tenant through the real registration flow.

test("register -> session -> me returns owner", async ({ page }) => {
  const account = await registerAndSignIn(page);
  const me = await page.request.get("/api/auth/me");
  expect(me.ok()).toBeTruthy();
  const body = await me.json();
  expect(body.user.email).toBe(account.email);
  expect(body.user.role).toBe("owner");
});

test("login round-trip with registered credentials", async ({ page }) => {
  const account = await registerAndSignIn(page);
  await page.request.post("/api/auth/logout");

  await page.goto("/login");
  await page.getByLabel(/Email|البريد/).fill(account.email);
  await page.getByLabel(/Password|كلمة/).fill(account.password);
  await page.getByRole("button", { name: /Sign in|دخول/ }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
});

test("wrong password is rejected", async ({ page }) => {
  const account = await registerAndSignIn(page);
  await page.request.post("/api/auth/logout");

  await page.goto("/login");
  await page.getByLabel(/Email|البريد/).fill(account.email);
  await page.getByLabel(/Password|كلمة/).fill("definitely-wrong");
  await page.getByRole("button", { name: /Sign in|دخول/ }).click();
  await expect(page.getByText(/Invalid email or password|بيانات/i)).toBeVisible();
});

test("unauthenticated API access is denied", async ({ request }) => {
  // The proxy may redirect to /login; don't follow it — any of deny/redirect is
  // acceptable, a 200 with tenant data is not.
  const res = await request.get("/api/companies", { maxRedirects: 0 });
  expect([301, 302, 307, 308, 401, 403]).toContain(res.status());
});
