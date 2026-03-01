import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";
import {
  inputTestId,
  openAddNew,
} from "../../helpers/admin";

test.describe("Business Admin - Products", () => {
  test("can create a product from the Products tab", async ({ page }) => {
    const { slug } = readBusinessSeed();
    const productName = `E2E Product ${Date.now()}`;

    await page.goto(`/${slug}/admin?tab=Products`);
    await openAddNew(page);

    await expect(
      page.getByRole("heading", { name: /Add new product/i }),
    ).toBeVisible();

    await page.getByTestId(inputTestId(["title"])).fill(productName);
    await page.getByTestId(inputTestId(["hsCode"])).fill("HS-1234");
    await page.getByTestId(inputTestId(["costPrice"])).fill("100");

    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText(productName)).toBeVisible();
  });
});
