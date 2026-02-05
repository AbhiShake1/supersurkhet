import { expect, test } from "@playwright/test";

test.describe("Business Chat", () => {
  test("renders the chat layout", async ({ page }) => {
    await page.goto("/chat");

    await expect(
      page.getByPlaceholder("Search or start new chat"),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Type a message"),
    ).toBeVisible();
  });
});
