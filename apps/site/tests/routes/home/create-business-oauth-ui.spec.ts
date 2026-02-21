import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import SEA from "gun/sea.js";

async function openBusinessOnboarding(page: Page) {
  const businessName = `OAuth UI E2E ${Date.now()}`;
  const welcomeHeading = page.getByRole("heading", {
    name: /Welcome! Let's start with the basics./i,
  });
  const loginPromptDescription = page.getByText("Please sign in to continue.", {
    exact: true,
  });

  const keyPair = await SEA.pair();
  await page.context().addCookies([
    {
      name: "gun-user",
      value: encodeURIComponent(JSON.stringify(keyPair)),
      url: "http://localhost:3000",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Browse Businesses/i }),
  ).toBeVisible({ timeout: 30_000 });
  const getStartedTrigger = page.getByText(/Get Started Free/i).first();
  await expect(getStartedTrigger).toBeVisible({ timeout: 30_000 });

  let didOpenOnboarding = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await getStartedTrigger.click().catch(() => undefined);
    await page.waitForTimeout(500);
    if (await loginPromptDescription.isVisible().catch(() => false)) {
      throw new Error(
        "Authenticated bootstrap is missing: create-business flow opened login prompt instead of onboarding modal.",
      );
    }
    if (
      (await page
        .waitForURL("**/create-business", { timeout: 2500 })
        .then(() => true)
        .catch(() => false)) &&
      (await welcomeHeading.isVisible().catch(() => false))
    ) {
      didOpenOnboarding = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (!didOpenOnboarding) {
    throw new Error(
      "Failed to open onboarding modal from hero CTA after repeated attempts.",
    );
  }

  await expect(welcomeHeading).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/create-business$/);

  await page.getByLabel("Business Name").fill(businessName);
  await page.getByRole("button", { name: /Continue to AI setup/i }).click();

  await expect(page.getByText("AI Business Onboarding")).toBeVisible();
}

async function chooseProvider(page: Page, providerLabel: RegExp) {
  const providerField = page
    .getByText("AI provider", { exact: true })
    .locator("xpath=..");
  await providerField.getByRole("combobox").first().click();
  await page.getByRole("option", { name: providerLabel }).first().click();
}

async function setOauthAuthMode(page: Page) {
  const authModeField = page
    .getByText("Auth mode", { exact: true })
    .locator("xpath=..");
  await authModeField.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /^OAuth access token$/i }).click();
}

async function chooseOauthMethod(page: Page, methodLabel: RegExp) {
  const oauthMethodField = page
    .getByText("OAuth method", { exact: true })
    .locator("xpath=..");
  await oauthMethodField.getByRole("combobox").first().click();
  await page.getByRole("option", { name: methodLabel }).first().click();
}

test.describe("Create Business onboarding oauth ui", () => {
  test.describe.configure({ mode: "serial" });

  test("loads oauth methods dynamically and opens popup for browser oauth", async ({
    page,
  }) => {
    const requestedProviders: string[] = [];

    await page.route("**/v1/auth/providers/methods?*", async (route) => {
      const url = new URL(route.request().url());
      const providerId = url.searchParams.get("providerId") ?? "";
      requestedProviders.push(providerId);

      if (providerId === "openrouter") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            providerId: "openrouter",
            methods: [
              {
                id: "openrouter-account-oauth",
                type: "oauth",
                label: "OpenRouter account OAuth",
              },
              { id: "api-key", type: "api", label: "API key" },
            ],
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.route("**/v1/auth/providers/oauth/authorize", async (route) => {
      const rawBody = route.request().postData() ?? "{}";
      const parsedBody = JSON.parse(rawBody) as {
        providerId?: string;
        methodId?: string;
      };
      if (parsedBody.providerId === "openrouter") {
        expect(parsedBody.methodId).toBe("openrouter-account-oauth");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            object: "provider_oauth_authorization",
            providerId: "openrouter",
            method: "openrouter-account-oauth",
            authorizationUrl: "https://example.com/openrouter-auth",
            expiresAt: 1735689600,
            redirectUri: "http://localhost:3000/v1/auth/providers/oauth/callback",
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route("**/v1/auth/providers", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            object: "list",
            data: [
              {
                providerId: "openrouter",
                model: "openai/gpt-5",
                authMode: "oauth-access-token",
                hasOauthAccessToken: true,
                hasOauthRefreshToken: false,
                updatedAt: Math.floor(Date.now() / 1000),
              },
            ],
          }),
        });
        return;
      }
      await route.continue();
    });

    await openBusinessOnboarding(page);
    await chooseProvider(page, /OpenRouter/i);
    await setOauthAuthMode(page);

    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: /Connect OpenRouter account/i }).click();
    const popup = await popupPromise;
    await expect.poll(() => popup.url()).toContain("https://example.com/openrouter-auth");
    await popup.close();

    await expect.poll(() => requestedProviders.includes("openrouter")).toBe(true);
  });

  test("runs headless oauth finalize polling from onboarding ui", async ({ page }) => {
    let callbackPolls = 0;

    await page.route("**/v1/auth/providers/methods?*", async (route) => {
      const url = new URL(route.request().url());
      const providerId = url.searchParams.get("providerId") ?? "";
      if (providerId === "openai") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            providerId: "openai",
            methods: [
              {
                id: "openai-chatgpt-pro-plus-browser",
                type: "oauth",
                label: "ChatGPT Plus/Pro (browser OAuth)",
              },
              {
                id: "openai-chatgpt-pro-plus-headless",
                type: "oauth",
                label: "ChatGPT Plus/Pro (headless device OAuth)",
              },
              { id: "api-key", type: "api", label: "API key" },
            ],
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route("**/v1/auth/providers/oauth/authorize", async (route) => {
      const rawBody = route.request().postData() ?? "{}";
      const parsedBody = JSON.parse(rawBody) as {
        providerId?: string;
        methodId?: string;
      };
      if (
        parsedBody.providerId === "openai" &&
        parsedBody.methodId === "openai-chatgpt-pro-plus-headless"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            object: "provider_oauth_authorization",
            providerId: "openai",
            method: "openai-chatgpt-pro-plus-headless",
            authorizationUrl: "https://example.com/openai-device-auth",
            verificationCode: "OPENAI-UI-CODE",
            pollingIntervalSeconds: 1,
            expiresAt: 1735689600,
            redirectUri: "http://localhost:3000/v1/auth/providers/oauth/callback",
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route("**/v1/auth/providers/oauth/callback", async (route) => {
      callbackPolls += 1;
      if (callbackPolls === 1) {
        await route.fulfill({
          status: 202,
          headers: {
            "content-type": "application/json",
            "Retry-After": "1",
          },
          body: JSON.stringify({
            object: "provider_oauth_callback",
            providerId: "openai",
            method: "openai-chatgpt-pro-plus-headless",
            status: "pending",
            retryAfterSeconds: 1,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          object: "provider_oauth_callback",
          providerId: "openai",
          method: "openai-chatgpt-pro-plus-headless",
          data: {
            providerId: "openai",
            authMode: "oauth-access-token",
            hasOauthAccessToken: true,
            updatedAt: Math.floor(Date.now() / 1000),
          },
        }),
      });
    });

    await page.route("**/v1/auth/providers", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            object: "list",
            data: [
              {
                providerId: "openai",
                model: "gpt-5-mini",
                authMode: "oauth-access-token",
                hasOauthAccessToken: true,
                hasOauthRefreshToken: true,
                updatedAt: Math.floor(Date.now() / 1000),
              },
            ],
          }),
        });
        return;
      }
      await route.continue();
    });

    await openBusinessOnboarding(page);
    await chooseProvider(page, /OpenAI .* openai/i);
    await setOauthAuthMode(page);

    await chooseOauthMethod(page, /Headless Device OAuth/i);

    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: /Connect ChatGPT Plus\/Pro \(Device\)/i })
      .click();
    const popup = await popupPromise;
    await expect.poll(() => popup.url()).toContain("https://example.com/openai-device-auth");
    await popup.close();

    await expect.poll(() => callbackPolls).toBeGreaterThanOrEqual(2);
  });
});
