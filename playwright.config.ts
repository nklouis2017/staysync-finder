import fs from "fs";
import path from "path";
import { defineConfig, devices } from "@playwright/test";

function trimBase(raw?: string) {
  return raw?.replace(/\/$/, "");
}

/** Staysync (Vite) — default dev port from vite.config.ts */
const finderBase =
  trimBase(process.env.E2E_BASE_URL_STAYSYNC) ??
  trimBase(process.env.PLAYWRIGHT_BASE_URL) ??
  "http://127.0.0.1:8080";

/** Tenant admin (Next.js) — use a different dev port than super-admin when running both locally */
const adminBase = trimBase(process.env.E2E_BASE_URL_ADMIN) ?? "http://127.0.0.1:3000";

const superAdminBase =
  trimBase(process.env.E2E_BASE_URL_SUPER_ADMIN) ?? "http://127.0.0.1:3001";

const workspaceRoot = process.cwd();

const finderWebServer =
  process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
    ? undefined
    : {
        command: "npm run dev",
        url: finderBase,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      };

const chrome = devices["Desktop Chrome"];

const authAdminRel = path.join("e2e", ".auth", "admin.json");
const authSuperRel = path.join("e2e", ".auth", "super-admin.json");
const authAdminAbs = path.join(workspaceRoot, authAdminRel);
const authSuperAbs = path.join(workspaceRoot, authSuperRel);

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    {
      name: "finder-smoke-chromium",
      testDir: "e2e/finder",
      use: { baseURL: finderBase, trace: "on-first-retry", ...chrome },
    },
    {
      name: "admin-session-chromium",
      testDir: "e2e/admin",
      testMatch: "auth.setup.ts",
      use: { baseURL: adminBase, trace: "on-first-retry", ...chrome },
    },
    {
      name: "super-admin-session-chromium",
      testDir: "e2e/super-admin",
      testMatch: "auth.setup.ts",
      use: {
        baseURL: superAdminBase,
        trace: "on-first-retry",
        ...chrome,
      },
    },
    {
      name: "admin-smoke-chromium",
      testDir: "e2e/admin",
      testIgnore: ["auth.setup.ts", "authenticated.spec.ts"],
      use: { baseURL: adminBase, trace: "on-first-retry", ...chrome },
    },
    {
      name: "super-admin-smoke-chromium",
      testDir: "e2e/super-admin",
      testIgnore: ["auth.setup.ts", "authenticated.spec.ts"],
      use: {
        baseURL: superAdminBase,
        trace: "on-first-retry",
        ...chrome,
      },
    },
    ...(process.env.E2E_RUN_AUTHENTICATED === "1" && fs.existsSync(authAdminAbs)
      ? [
          {
            name: "admin-authenticated-chromium",
            testDir: "e2e/admin",
            testMatch: "authenticated.spec.ts",
            use: {
              baseURL: adminBase,
              storageState: authAdminRel,
              trace: "on-first-retry" as const,
              ...chrome,
            },
          },
        ]
      : []),
    ...(process.env.E2E_RUN_SUPER_AUTHENTICATED === "1" && fs.existsSync(authSuperAbs)
      ? [
          {
            name: "super-admin-authenticated-chromium",
            testDir: "e2e/super-admin",
            testMatch: "authenticated.spec.ts",
            use: {
              baseURL: superAdminBase,
              storageState: authSuperRel,
              trace: "on-first-retry" as const,
              ...chrome,
            },
          },
        ]
      : []),
  ],
  ...(finderWebServer ? { webServer: finderWebServer } : {}),
});
