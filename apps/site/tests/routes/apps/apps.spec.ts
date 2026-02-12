import { expect, test } from "@playwright/test";

test.describe("Apps", () => {
  test("shows the app drawer search and settings", async ({ page }) => {
    await page.goto("/apps/");

    await expect(
      page.getByPlaceholder("Search apps by name..."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Settings/i }),
    ).toBeVisible();

    const searchInput = page.getByPlaceholder("Search apps by name...");
    await searchInput.fill("no-such-app");

    await expect(
      page.getByText("No apps found matching your search."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Clear Search/i }),
    ).toBeVisible();
  });
});
