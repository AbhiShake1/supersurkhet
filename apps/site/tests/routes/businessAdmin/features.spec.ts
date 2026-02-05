import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Admin - Features", () => {
  test("renders core retail tabs from business config", async ({ page }) => {
    const { slug } = readBusinessSeed();

    const tabs = [
      { tab: "Products", schema: "product" },
      { tab: "Purchase Parties", schema: "party" },
      { tab: "Customers", schema: "customer" },
      { tab: "Stock Imports", schema: "stockImport" },
      { tab: "Sales", schema: "sale" },
      { tab: "Invoices", schema: "invoice", readOnly: true },
      { tab: "Orders", schema: "order" },
      { tab: "Vehicles", schema: "vehicle" },
      { tab: "Trips", schema: "trip" },
    ];

    for (const { tab, schema, readOnly } of tabs) {
      await page.goto(`/${slug}/admin?tab=${encodeURIComponent(tab)}`);
      await expect(page.getByRole("heading", { name: tab })).toBeVisible();

      if (readOnly) {
        continue;
      }

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
        page.getByRole("heading", {
          name: new RegExp(`Add new ${schema}`, "i"),
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Cancel/i }).click();
    }
  });
});
