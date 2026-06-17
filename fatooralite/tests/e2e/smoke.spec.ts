import { test, expect } from "@playwright/test";

test("redirects to dashboard and renders shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("aside")).toBeVisible();
});

test("language toggle flips dir to ltr and back", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(html).toHaveAttribute("dir", "ltr");
  await page.getByRole("button", { name: "ع", exact: true }).click();
  await expect(html).toHaveAttribute("dir", "rtl");
});

test("theme toggle changes data-theme", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  const before = (await html.getAttribute("data-theme")) ?? "dark";
  await page.getByTitle("Theme").click();
  await expect(html).not.toHaveAttribute("data-theme", before);
});

test("nav switches to invoices and renders the table", async ({ page }) => {
  await page.goto("/dashboard");
  // Switch to English first so we click a stable label.
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("link", { name: /Invoices/ }).first().click();
  await expect(page).toHaveURL(/\/invoices/);
  await expect(page.getByText("INV-2026-04417")).toBeVisible();
});

test("all six live modules respond 200", async ({ page }) => {
  for (const path of ["/dashboard", "/invoices", "/integration", "/clearance", "/analytics", "/ai"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
  }
});
