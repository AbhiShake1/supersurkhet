import { expect, test } from "@playwright/test";
import { readBusinessSeed } from "../../helpers/seed";

test.describe("Business Admin - Invitation", () => {
  test.skip("requires seeded invitation token", async ({ page }) => {
    const { slug } = readBusinessSeed();

    // TODO: seed invitation token + auth, then verify accept/reject flows.
    await page.goto(`/${slug}/admin/invitation?token=e2e-token`);

    await expect(
      page.getByRole("heading", { name: /Organization Invitation/i }),
    ).toBeVisible();
  });
});
