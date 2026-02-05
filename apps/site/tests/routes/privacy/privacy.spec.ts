import { expect, test } from "@playwright/test";

test.describe("Privacy", () => {
  test("renders the privacy policy content", async ({ page }) => {
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { name: /Privacy Policy/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Data Control & Decentralization/i),
    ).toBeVisible();
  });
});
