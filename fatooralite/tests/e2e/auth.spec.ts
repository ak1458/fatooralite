import { test, expect } from "@playwright/test";

// These run with AUTH_ENFORCE unset (dev default), so pages are open; we verify
// the login flow itself works end-to-end (credentials -> session -> me).

test("login with demo credentials sets a session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Email|البريد/).fill("khalid@almarai.example");
  await page.getByLabel(/Password|كلمة/).fill("owner1234");
  await page.getByRole("button", { name: /Sign in|دخول/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const me = await page.request.get("/api/auth/me");
  const body = await me.json();
  expect(body.user.role).toBe("owner");
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Email|البريد/).fill("khalid@almarai.example");
  await page.getByLabel(/Password|كلمة/).fill("wrong");
  await page.getByRole("button", { name: /Sign in|دخول/ }).click();
  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
});
