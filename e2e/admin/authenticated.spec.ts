import { expect, test } from "@playwright/test";

test("apartment list route reachable when session valid", async ({ page }) => {
  await page.goto("/apartment");
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
});
