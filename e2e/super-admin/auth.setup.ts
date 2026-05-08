import path from "path";
import { fileURLToPath } from "url";
import { expect, test as setup } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, "..", ".auth", "super-admin.json");

setup("super-admin storage state", async ({ page }) => {
  setup.skip(
    !process.env.E2E_SUPER_ADMIN_USER || !process.env.E2E_SUPER_ADMIN_PASSWORD,
    "Set E2E_SUPER_ADMIN_USER and E2E_SUPER_ADMIN_PASSWORD to record super-admin session.",
  );

  await page.goto("/auth/login");
  await page.locator('input[name="username"]').fill(process.env.E2E_SUPER_ADMIN_USER!);
  await page.locator('input[name="password"]').fill(process.env.E2E_SUPER_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 60_000 });
  await page.context().storageState({ path: authFile });
});
