import { expect, test } from "@playwright/test";

test.describe("Auth - Settings", () => {
  test("renders settings and logout", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Log out/i })).toBeVisible();

    const switches = page.getByRole("switch");
    await expect(switches).toHaveCount(2);

    const emailSwitch = switches.first();
    const initialChecked = await emailSwitch.getAttribute("aria-checked");
    await emailSwitch.click();
    await expect(emailSwitch).not.toHaveAttribute("aria-checked", initialChecked);

    const languageSelect = page.locator('select[name="language"]');
    await languageSelect.selectOption("ne");
    await expect(languageSelect).toHaveValue("ne");

    const themeToggle = page.getByRole("button", { name: /Toggle theme/i });
    const wasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    await themeToggle.click();
    await expect.poll(async () => page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    )).toBe(!wasDark);

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.getByRole("button", { name: /Saved!/i })).toBeVisible();
  });
});
