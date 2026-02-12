import { expect, test } from "@playwright/test";

test.describe("S3 Test", () => {
  test("renders the test page", async ({ page }) => {
    await page.goto("/s3test");

    await expect(page.getByText('Hello "/s3test"!')).toBeVisible();
  });
});
