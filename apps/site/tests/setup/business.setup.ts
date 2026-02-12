import { expect, test } from "@playwright/test";
import { toSlug, writeBusinessSeed } from "../helpers/seed";

test("create a business for E2E", async ({ page }) => {
  const businessName = `E2E Business ${Date.now()}`;
  const slug = toSlug(businessName);

  await page.goto("/");
  await page.getByRole("button", { name: /Get Started Free/i }).click();

  await expect(
    page.getByRole("heading", { name: /Welcome! Let's start with the basics./i }),
  ).toBeVisible();

  const nextButton = page.getByRole("button", { name: /^Next$/i });
  await expect(nextButton).toBeDisabled();

  await page.getByLabel("Business Name").fill(businessName);
  await page.getByText(/^retail$/i).click();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await expect(
    page.getByRole("heading", { name: /Pre-populate Your Data/i }),
  ).toBeVisible();

  const noDataMessage = page.getByText(
    /No similar data found for pre-population/i,
  );
  const prepopulateCheckboxes = page.locator('[data-slot="checkbox"]');

  if (await noDataMessage.isVisible().catch(() => false)) {
    await expect(noDataMessage).toBeVisible();
  } else if (
    (await prepopulateCheckboxes.count()) > 0 &&
    (await prepopulateCheckboxes.first().isVisible().catch(() => false))
  ) {
    await expect(prepopulateCheckboxes.first()).toBeVisible();
  }

  await page.getByRole("button", { name: /Create Business/i }).click();
  await expect(page.getByText(/Business Created!/i)).toBeVisible();

  writeBusinessSeed({ slug, name: businessName });

  await page.getByRole("link", { name: /Go to Public Site/i }).click();
  await expect(
    page.getByRole("button", { name: /Go to Admin/i }),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: /Get Started Free/i }).click();
  await page.getByLabel("Business Name").fill(businessName);
  await page.getByText(/^retail$/i).click();
  await page.getByRole("button", { name: /^Next$/i }).click();
  await expect(
    page.getByText(/A business with this name already exists/i),
  ).toBeVisible();
});
