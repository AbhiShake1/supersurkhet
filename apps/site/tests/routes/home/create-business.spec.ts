import { expect, test } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("Home - Create Business", () => {
  test("prompts login before starting business creation", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Get Started Free/i }).click();

    await expect(
      page.getByRole("heading", { name: /Sign In/i }),
    ).toBeVisible();
  });

  test("browse businesses create flow prompts login", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Browse Businesses/i }).click();
    await page.getByRole("button", { name: /Create Your Own Business/i }).click();

    await expect(
      page.getByRole("heading", { name: /Sign In/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Please sign in to continue.", { exact: true }),
    ).toBeVisible();
  });
});
