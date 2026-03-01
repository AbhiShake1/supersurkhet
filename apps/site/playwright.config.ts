/// <reference types="node" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "tests/.auth/user.json");

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    cwd: __dirname,
    timeout: 120_000,
  },
  projects: [
    {
      name: "setup-auth",
      testMatch: "setup/auth.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup-business",
      testMatch: "setup/business.setup.ts",
      dependencies: ["setup-auth"],
      use: { ...devices["Desktop Chrome"], storageState: authFile },
    },
    {
      name: "public",
      testMatch: [
        "routes/home/**/*.spec.ts",
        "routes/privacy/**/*.spec.ts",
        "routes/s3test/**/*.spec.ts",
        "routes/auth/login.spec.ts",
        "routes/admin/**/*.spec.ts",
        "routes/apps/**/*.spec.ts",
        "routes/businessChat/**/*.spec.ts",
      ],
      dependencies: ["setup-business"],
      use: { ...devices["Desktop Chrome"], storageState: undefined },
    },
    {
      name: "client",
      testMatch: ["routes/businessClient/**/*.spec.ts"],
      dependencies: ["setup-business"],
      use: { ...devices["Desktop Chrome"], storageState: authFile },
    },
    {
      name: "admin",
      testMatch: ["routes/businessAdmin/**/*.spec.ts", "routes/auth/settings.spec.ts"],
      dependencies: ["setup-business"],
      use: { ...devices["Desktop Chrome"], storageState: authFile },
    },
    {
      name: "logout",
      testMatch: ["routes/auth/logout.spec.ts"],
      dependencies: ["setup-business"],
      use: { ...devices["Desktop Chrome"], storageState: authFile },
    },
  ],
});
