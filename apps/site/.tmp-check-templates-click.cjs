const { chromium } = require('@playwright/test');

(async () => {
  const url = 'http://localhost:3000/plugin-studio/project.etp5tisukuxzbthmh5ggjjtmexvribkjpeoz8qn40ki.8c616z0msvstskst5oeidxd9jbwnwqfmhd73fychbhw.abc/plugin.etp5tisukuxzbthmh5ggjjtmexvribkjpeoz8qn40ki.8c616z0msvstskst5oeidxd9jbwnwqfmhd73fychbhw.abc?tab=Website+UI';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1450, height: 858 } });
  page.on('console', (m) => console.log('console:', m.type(), m.text()));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const buttons = page.locator('button[aria-label="Open Templates"]');
  const count = await buttons.count();
  console.log('openTemplatesButtonCount', count);
  if (count > 0) {
    await buttons.first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);
    console.log('uiTemplatesTextCount', await page.getByText('UI Templates').count());
    console.log('dialogCount', await page.locator('[role="dialog"]').count());
    console.log('openStateCount', await page.locator('[data-state="open"]').count());
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
