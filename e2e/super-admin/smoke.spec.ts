import { expect, test } from "@playwright/test";

test.describe("super-admin smoke", () => {
  test("login page loads", async ({ page }) => {
    const res = await page.goto("/auth/login");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });
});
