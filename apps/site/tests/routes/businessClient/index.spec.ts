import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Client", () => {
  test("renders client view with admin access gate", async ({ page }) => {
    const { slug } = readBusinessSeed();

    await page.goto(`/${slug}`);

    await expect(
      page.getByRole("button", { name: /Go to Admin/i }),
    ).toBeVisible();
  });
});
