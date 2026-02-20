import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnvOrThrow } from "../helpers/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "..", ".auth", "user.json");

test("login and save auth state", async ({ page }) => {
  const email = getEnvOrThrow("E2E_USER_EMAIL");
  const password = getEnvOrThrow("E2E_USER_PASSWORD");

  await page.goto("/auth?m=login&redirect=/");

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^Sign In$/i }).click();

  await expect(
    page.getByRole("button", { name: /Browse Businesses/i }),
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
