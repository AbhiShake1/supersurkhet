import { expect, test } from "@playwright/test";
import {
  gotoAdminTab,
  inputTestId,
  openAddNew,
  selectCombobox,
} from "../../helpers/admin";

test.describe("Business Admin - Sales", () => {
  test("updates payment status based on paid amount", async ({ page }) => {
    const productName = `E2E Sale Product ${Date.now()}`;
    const partyName = `E2E Sale Party ${Date.now()}`;
    const customerName = `E2E Sale Customer ${Date.now()}`;

    await gotoAdminTab(page, "Purchase Parties");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(partyName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(partyName)).toBeVisible();

    await gotoAdminTab(page, "Products");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["title"])).fill(productName);
    await selectCombobox(page, inputTestId(["purchasePartyId"]), partyName);
    await page.getByTestId(inputTestId(["hsCode"])).fill("HS-3001");
    await page.getByTestId(inputTestId(["costPrice"])).fill("60");
    await page.getByTestId(inputTestId(["sellingPrice"])).fill("120");
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(productName)).toBeVisible();

    await gotoAdminTab(page, "Stock Imports");
    await openAddNew(page);
    await selectCombobox(page, inputTestId(["party"]), partyName);
    await page.getByTestId("af-add-items").click();
    await selectCombobox(page, inputTestId(["items", "0", "product"]), productName);
    await page.getByTestId(inputTestId(["items", "0", "quantity"])).fill("5");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await gotoAdminTab(page, "Customers");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(customerName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(customerName)).toBeVisible();

    await gotoAdminTab(page, "Sales");
    await openAddNew(page);

    await selectCombobox(page, inputTestId(["customerId"]), customerName);
    await page.getByTestId("af-add-items").click();

    await selectCombobox(
      page,
      inputTestId(["items", "0", "product"]),
      `${productName} | ${partyName} | Available: 5`,
    );

    await page.getByTestId(inputTestId(["items", "0", "quantity"])).fill("1");

    await expect(
      page.getByTestId(inputTestId(["items", "0", "unitPrice"])),
    ).toHaveValue("120");
    await expect(
      page.getByTestId(inputTestId(["items", "0", "totalAmount"])),
    ).toHaveValue("120");

    await page.getByTestId(inputTestId(["paidAmount"])).fill("60");
    await expect(
      page.getByTestId(inputTestId(["paymentStatus"])),
    ).toHaveValue(/partial/i);

    await page.getByTestId(inputTestId(["paidAmount"])).fill("120");
    await expect(
      page.getByTestId(inputTestId(["paymentStatus"])),
    ).toHaveValue(/paid/i);

    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(customerName)).toBeVisible();
  });
});
