import { expect, test } from "@playwright/test";

test.describe("Business Client - Not Found", () => {
  test("shows not found page for unknown business", async ({ page }) => {
    await page.goto("/nonexistent-e2e-business");

    await expect(
      page.getByRole("button", { name: /Take Me Home, Country Roads/i }),
    ).toBeVisible();
  });
});
