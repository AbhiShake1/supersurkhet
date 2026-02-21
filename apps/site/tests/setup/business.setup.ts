import { expect, test } from "@playwright/test";
import { toSlug, writeBusinessSeed } from "../helpers/seed";

test("create a business for E2E", async ({ page }) => {
  const businessName = `E2E Business ${Date.now()}`;
  const slug = toSlug(businessName);

  await page.goto("/");
  await page.getByRole("link", { name: /Get Started Free/i }).click();
  await expect(page).toHaveURL(/\/create-business$/);

  await expect(
    page.getByRole("heading", { name: /Start your business/i }),
  ).toBeVisible();

  const nextButton = page.getByRole("button", { name: /^Continue$/i });
  await expect(nextButton).toBeDisabled();

  await page.getByLabel("Business Name").fill(businessName);
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await expect(page.getByText("AI Business Onboarding")).toBeVisible();
  await page.getByRole("button", { name: /Review Plugins/i }).click();
  await expect(page.getByText("Plugin Browser")).toBeVisible();

  await page.getByRole("button", { name: /Create Business/i }).click();
  await expect(page.getByText(/Business Created!/i)).toBeVisible();

  writeBusinessSeed({ slug, name: businessName });

  await page.getByRole("link", { name: /Go to Public Site/i }).click();
  await expect(
    page.getByRole("button", { name: /Go to Admin/i }),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /Get Started Free/i }).click();
  await page.getByLabel("Business Name").fill(businessName);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(
    page.getByText(/A business with this name already exists/i),
  ).toBeVisible();
});
