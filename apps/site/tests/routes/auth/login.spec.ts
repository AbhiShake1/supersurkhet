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

  test("signup validates mismatched passwords", async ({ page }) => {
    await page.goto("/auth?m=signup");

    await page.getByLabel(/email/i).fill("mismatch@example.com");
    await page.getByLabel(/^password$/i).fill("abc123");
    await page.getByLabel(/confirm password/i).fill("abc124");

    await page
      .getByRole("button", { name: /Send Verification OTP Email/i })
      .click();

    await expect(page.getByText(/Passwords don't match/i)).toBeVisible();
  });

  test("signup rate limit shows cooldown toast", async ({ page }) => {
    const email = "rate-limit@example.com";

    await page.goto("/auth?m=signup");

    await page.evaluate((value) => {
      const key = `otp_rate_limit_${value.toLowerCase()}`;
      localStorage.setItem(
        key,
        JSON.stringify({ lastSent: Date.now(), attempts: 1 }),
      );
    }, email);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill("abc123");
    await page.getByLabel(/confirm password/i).fill("abc123");

    await page
      .getByRole("button", { name: /Send Verification OTP Email/i })
      .click();

    await expect(
      page.getByText(/Please wait .* seconds before requesting another verification email/i),
    ).toBeVisible();
  });
});
