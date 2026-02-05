import { expect, test } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("Admin", () => {
  test("prompts unauthenticated users to sign in", async ({ page }) => {
    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: /Sign In/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Please sign in to continue.", { exact: true }),
    ).toBeVisible();
  });
});
