import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Admin - UI Builder Editor", () => {
  test("opens the editor shell", async ({ page }) => {
    const { slug } = readBusinessSeed();

    await page.goto(`/${slug}/admin/editor`);

    await expect(
      page.getByRole("heading", { name: /UI Builder Editor/i }),
    ).toBeVisible();
  });
});
