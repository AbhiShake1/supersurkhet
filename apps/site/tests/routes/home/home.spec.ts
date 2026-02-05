import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Home", () => {
  test("shows primary hero actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /Browse Businesses/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Get Started Free/i }),
    ).toBeVisible();
  });

  test("browse businesses modal supports search", async ({ page }) => {
    const { name } = readBusinessSeed();

    await page.goto("/");
    await page.getByRole("button", { name: /Browse Businesses/i }).click();

    await expect(
      page.getByRole("heading", { name: /Explore Local Businesses/i }),
    ).toBeVisible();

    const searchInput = page.getByPlaceholder(
      "Search businesses by name, type, or location...",
    );
    await searchInput.fill(name);

    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByRole("button", { name: /Visit/i })).toBeVisible();

    await searchInput.fill("no-such-business");
    await expect(
      page.getByText("No businesses found matching your search."),
    ).toBeVisible();
    await page.getByRole("button", { name: /Clear Search/i }).click();
    await expect(page.getByText(name)).toBeVisible();
  });

  test("browse businesses visit navigates to the business page", async ({ page }) => {
    const { name, slug } = readBusinessSeed();

    await page.goto("/");
    await page.getByRole("button", { name: /Browse Businesses/i }).click();

    const searchInput = page.getByPlaceholder(
      "Search businesses by name, type, or location...",
    );
    await searchInput.fill(name);

    await page.getByRole("button", { name: /Visit/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}(/)?$`));
    await expect(
      page.getByRole("button", { name: /Contact Us/i }),
    ).toBeVisible();
  });

  test("pricing toggle switches to annual billing", async ({ page }) => {
    await page.goto("/");

    const pricingSection = page.locator("#pricing");
    await pricingSection
      .getByRole("heading", { name: /Community-First Pricing/i })
      .scrollIntoViewIfNeeded();

    await expect(pricingSection.getByText(/billed monthly/i).first()).toBeVisible();

    await pricingSection.getByRole("switch").click();

    await expect(pricingSection.getByText(/billed annually/i).first()).toBeVisible();
  });
});
