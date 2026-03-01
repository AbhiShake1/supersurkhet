import { expect, test } from "@playwright/test";
import {
  gotoAdminTab,
  inputTestId,
  openAddNew,
  selectCombobox,
} from "../../helpers/admin";

test.describe("Business Admin - Orders", () => {
  test("validates stock availability on quantity", async ({ page }) => {
    const productName = `E2E Order Product ${Date.now()}`;
    const partyName = `E2E Order Party ${Date.now()}`;
    const customerName = `E2E Customer ${Date.now()}`;

    await gotoAdminTab(page, "Purchase Parties");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(partyName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(partyName)).toBeVisible();

    await gotoAdminTab(page, "Products");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["title"])).fill(productName);
    await selectCombobox(page, inputTestId(["purchasePartyId"]), partyName);
    await page.getByTestId(inputTestId(["hsCode"])).fill("HS-2001");
    await page.getByTestId(inputTestId(["costPrice"])).fill("20");
    await page.getByTestId(inputTestId(["sellingPrice"])).fill("50");
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(productName)).toBeVisible();

    await gotoAdminTab(page, "Stock Imports");
    await openAddNew(page);
    await selectCombobox(page, inputTestId(["party"]), partyName);
    await page.getByTestId("af-add-items").click();
    await selectCombobox(page, inputTestId(["items", "0", "product"]), productName);
    await page.getByTestId(inputTestId(["items", "0", "quantity"])).fill("1");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await gotoAdminTab(page, "Customers");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(customerName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(customerName)).toBeVisible();

    await gotoAdminTab(page, "Orders");
    await openAddNew(page);

    await selectCombobox(page, inputTestId(["customerId"]), customerName);
    await page.getByTestId("af-add-items").click();

    await selectCombobox(
      page,
      inputTestId(["items", "0", "product"]),
      `${productName} - Available: 1`,
    );
    await selectCombobox(
      page,
      inputTestId(["items", "0", "purchasePartyId"]),
      `${partyName} - Available: 1`,
    );

    await expect(
      page.getByTestId(inputTestId(["items", "0", "unitPrice"])),
    ).toHaveValue("50");

    await page.getByTestId(inputTestId(["items", "0", "quantity"])).fill("2");
    await expect(
      page.getByText(new RegExp(`${productName} has 1 available for ${partyName}\\. You requested 2\\.`)),
    ).toBeVisible();
  });
});
