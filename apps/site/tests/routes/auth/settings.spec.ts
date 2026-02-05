import { expect, test } from "@playwright/test";

test.describe("Auth - Settings", () => {
  test("renders settings and logout", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Log out/i })).toBeVisible();

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.getByRole("button", { name: /Saved!/i })).toBeVisible();
  });
});
