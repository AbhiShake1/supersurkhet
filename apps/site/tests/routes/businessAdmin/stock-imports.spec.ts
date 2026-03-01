import { expect, test } from "@playwright/test";
import {
  gotoAdminTab,
  inputTestId,
  openAddNew,
  selectCombobox,
} from "../../helpers/admin";

test.describe("Business Admin - Stock Imports", () => {
  test("auto-calculates totals and payment status", async ({ page }) => {
    const productName = `E2E Stock Product ${Date.now()}`;
    const partyName = `E2E Party ${Date.now()}`;

    await gotoAdminTab(page, "Purchase Parties");
    await openAddNew(page);
    await page.getByTestId(inputTestId(["name"])).fill(partyName);
    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(partyName)).toBeVisible();

    await gotoAdminTab(page, "Products");
    await openAddNew(page);

    await page.getByTestId(inputTestId(["title"])).fill(productName);
    await selectCombobox(page, inputTestId(["purchasePartyId"]), partyName);
    await page.getByTestId(inputTestId(["hsCode"])).fill("HS-1001");
    await page.getByTestId(inputTestId(["costPrice"])).fill("100");

    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(productName)).toBeVisible();

    await gotoAdminTab(page, "Stock Imports");
    await openAddNew(page);

    await selectCombobox(page, inputTestId(["party"]), partyName);

    await page.getByTestId("af-add-items").click();

    await selectCombobox(
      page,
      inputTestId(["items", "0", "product"]),
      productName,
    );

    await page.getByTestId(inputTestId(["items", "0", "quantity"])).fill("2");

    await expect(
      page.getByTestId(inputTestId(["items", "0", "unitPrice"])),
    ).toHaveValue("100");
    await expect(
      page.getByTestId(inputTestId(["items", "0", "totalAmount"])),
    ).toHaveValue("200");

    await expect(page.getByTestId(inputTestId(["paidAmount"]))).toHaveValue(
      "200",
    );
    await expect(
      page.getByTestId(inputTestId(["paymentStatus"])),
    ).toHaveValue(/paid/i);

    await page.getByRole("button", { name: /^Save$/i }).click();
    await expect(page.getByText(partyName)).toBeVisible();
  });
});
