import { test, expect } from "@playwright/test";
import { registerAndSignIn } from "./helpers";

// Shell + navigation smoke for a FRESH tenant (clean empty state, no seed).

test.beforeEach(async ({ page }) => {
  await registerAndSignIn(page);
});

test("root redirects into the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
});

test("dashboard renders the shell for a fresh tenant", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("aside")).toBeVisible();
});

test("language toggle flips dir", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  const before = await html.getAttribute("dir");
  const target = before === "rtl" ? "EN" : "ع";
  await page.getByRole("button", { name: target, exact: true }).click();
  await expect(html).toHaveAttribute("dir", before === "rtl" ? "ltr" : "rtl");
});

test("theme toggle changes data-theme", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  const before = (await html.getAttribute("data-theme")) ?? "dark";
  await page.getByTitle("Theme").click();
  await expect(html).not.toHaveAttribute("data-theme", before);
});

test("invoices page shows a clean empty state (no fake data)", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page.getByText(/INV-\d{4}-\d+/)).toHaveCount(0);
});

test("all six live modules respond 200", async ({ page }) => {
  for (const path of ["/dashboard", "/invoices", "/integration", "/clearance", "/analytics", "/ai"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});
