import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Admin", () => {
  test("loads dashboard and injected system tabs", async ({ page }) => {
    const { slug } = readBusinessSeed();

    await page.goto(`/${slug}/admin`);

    await expect(
      page.getByRole("heading", { name: /Dashboard/i }),
    ).toBeVisible();

    await page.goto(`/${slug}/admin?tab=QR%20Management`);
    await expect(
      page.getByRole("heading", { name: /QR Management/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Visual Flow Builder/i),
    ).toBeVisible();

  });
});
