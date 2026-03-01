import { expect, test } from "@playwright/test";
import {
  gotoAdminTab,
  inputTestId,
  openAddNew,
  selectCombobox,
} from "../../helpers/admin";

test.describe("Business Admin - Products", () => {
  test("can create a product from the Products tab", async ({ page }) => {
    const productName = `E2E Product ${Date.now()}`;
    const partyName = `E2E Product Party ${Date.now()}`;

    await gotoAdminTab(page, "Purchase Parties");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(partyName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(partyName)).toBeVisible();

    await gotoAdminTab(page, "Products");
    await openAddNew(page);

    await expect(
      page.getByRole("heading", { name: /Add new product/i }),
    ).toBeVisible();

    await page.getByTestId(inputTestId(["title"])).fill(productName);
    await selectCombobox(page, inputTestId(["purchasePartyId"]), partyName);
    await page.getByTestId(inputTestId(["hsCode"])).fill("HS-1234");
    await page.getByTestId(inputTestId(["costPrice"])).fill("100");

    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText(productName)).toBeVisible();
  });
});
