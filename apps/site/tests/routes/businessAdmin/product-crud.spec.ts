import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Admin - Products", () => {
  test("can create a product from the Products tab", async ({ page }) => {
    const { slug } = readBusinessSeed();
    const productName = `E2E Product ${Date.now()}`;

    await page.goto(`/${slug}/admin?tab=Products`);

    const addNew = page.getByRole("button", { name: /Add New/i });
    if (!(await addNew.isVisible().catch(() => false))) {
      const tableTab = page.getByRole("tab", { name: /Table View/i });
      if (await tableTab.isVisible().catch(() => false)) {
        await tableTab.click();
      }
    }

    await expect(addNew).toBeVisible();
    await addNew.click();

    await expect(
      page.getByRole("heading", { name: /Add new product/i }),
    ).toBeVisible();

    await page.getByLabel(/Product Name/i).fill(productName);
    await page.getByLabel(/HS Code/i).fill("HS-1234");
    await page.getByLabel(/Cost Price/i).fill("100");
    await page.getByLabel(/Opening Stock Quantity/i).fill("5");

    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText(productName)).toBeVisible();
  });
});
