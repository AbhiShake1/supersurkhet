import { expect, type Page } from "@playwright/test";
import { readBusinessSeed } from "./seed";

function formatTestId(path: string[]) {
  return path.join("__").replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function inputTestId(path: string[]) {
  return `af-input-${formatTestId(path)}`;
}

export async function gotoAdminTab(page: Page, tab: string) {
  const { slug } = readBusinessSeed();
  await page.goto(`/${slug}/admin?tab=${encodeURIComponent(tab)}`);
  await expect(page.getByRole("heading", { name: tab })).toBeVisible();
  return slug;
}

export async function openAddNew(page: Page) {
  const addNew = page.getByRole("button", { name: /Add New/i });
  if (!(await addNew.isVisible().catch(() => false))) {
    const tableTab = page.getByRole("tab", { name: /Table View/i });
    if (await tableTab.isVisible().catch(() => false)) {
      await tableTab.click();
    }
  }
  await expect(addNew).toBeVisible();
  await addNew.click();
}

export async function selectCombobox(
  page: Page,
  testId: string,
  optionLabel: string,
) {
  await page.getByTestId(testId).click();
  await page.getByPlaceholder("Search options...").fill(optionLabel);
  await page.getByRole("option", { name: optionLabel }).click();
}
