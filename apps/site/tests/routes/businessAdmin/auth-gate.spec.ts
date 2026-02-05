import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.use({ storageState: undefined });

test.describe("Business Admin - Auth Gate", () => {
  test("prompts login when visiting admin without auth", async ({ page }) => {
    const { slug } = readBusinessSeed();

    await page.goto(`/${slug}/admin`);

    await expect(page.getByRole("heading", { name: /Sign In/i })).toBeVisible();
    await expect(
      page.getByText("Please sign in to continue.", { exact: true }),
    ).toBeVisible();
  });
});
