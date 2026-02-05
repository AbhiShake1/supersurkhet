import { expect, test } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("Auth - Login", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/auth");

    await expect(
      page.getByRole("heading", { name: /Sign In to Surkhet/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Login with Google/i }),
    ).toBeVisible();
  });

  test("can switch to signup mode", async ({ page }) => {
    await page.goto("/auth");

    await page.getByRole("link", { name: /Create account/i }).click();

    await expect(
      page.getByRole("heading", { name: /Create your account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Verification OTP Email/i }),
    ).toBeVisible();
  });
});
