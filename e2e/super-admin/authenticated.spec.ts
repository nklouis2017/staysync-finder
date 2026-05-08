import { expect, test } from "@playwright/test";

test("home route reachable when session valid", async ({ page }) => {
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
});
