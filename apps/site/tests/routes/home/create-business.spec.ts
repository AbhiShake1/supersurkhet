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
});
