import { expect, test } from "@playwright/test";

test.describe("Plugin Studio - Sidebar Persistence", () => {
  test("persists tab title and icon edits across immediate reload", async ({
    page,
  }) => {
    const runId = Date.now();
    const pluginId = `plugin.e2e.sidebar.${runId}`;
    const renamedTabTitle = `Orders QA ${runId}`;
    const iconName = "Zap";

    await page.goto(`/plugin-studio?pluginId=${encodeURIComponent(pluginId)}`);

    const defaultTabLink = page.getByRole("link", { name: "Example Table" });
    await expect(defaultTabLink).toBeVisible({ timeout: 20_000 });

    await page.getByText("Example Table", { exact: true }).dblclick();

    const tabTitleInput = page.locator('input[value="Example Table"]').first();
    await expect(tabTitleInput).toBeVisible();
    await tabTitleInput.fill(renamedTabTitle);
    await tabTitleInput.press("Enter");

    const renamedTabLink = page.getByRole("link", { name: renamedTabTitle });
    await expect(renamedTabLink).toBeVisible();

    const iconTrigger = renamedTabLink.locator("button").first();
    await iconTrigger.dblclick();

    const iconSearchInput = page.getByPlaceholder("Search Lucide icons");
    await expect(iconSearchInput).toBeVisible();
    await iconSearchInput.fill(iconName);
    await page.getByRole("button", { name: iconName, exact: true }).click();

    await expect(renamedTabLink.locator("svg.lucide-zap")).toBeVisible();

    await page.reload();

    const reloadedTabLink = page.getByRole("link", { name: renamedTabTitle });
    await expect(reloadedTabLink).toBeVisible({ timeout: 20_000 });
    await expect(reloadedTabLink.locator("svg.lucide-zap")).toBeVisible();
  });
});
