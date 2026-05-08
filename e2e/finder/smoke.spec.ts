import { expect, test } from "@playwright/test";

test.describe("staysync finder smoke (no PayOS)", () => {
  test("home responds", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
  });

  test("search route loads", async ({ page }) => {
    await page.goto("/search");
    await expect(page).toHaveURL(/\/search/);
  });

  test("map search route loads", async ({ page }) => {
    await page.goto("/search/map");
    await expect(page).toHaveURL(/\/search\/map/);
  });

  test("policy route loads", async ({ page }) => {
    await page.goto("/policy");
    await expect(page).toHaveURL(/\/policy/);
  });
});
