import { expect, test } from "@playwright/test";

test.describe("Auth - Logout", () => {
  test("logs out and redirects to login", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /Log out/i }).click();

    await expect(
      page.getByRole("heading", { name: /Sign In to Surkhet/i }),
    ).toBeVisible();
  });
});
