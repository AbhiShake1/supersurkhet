import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const homeRoutePath = resolve(process.cwd(), 'src/routes/index.tsx');

function getRouteContent() {
  return readFileSync(homeRoutePath, 'utf8');
}

describe('home plugin builder call-to-action contract', () => {
  it('links from home to plugin studio with bootstrapped workspace context', () => {
    const content = getRouteContent();

    expect(content).toContain('to="/plugin-studio"');
    expect(content).toContain('Open Plugin Builder');
    expect(content).toContain("tab: 'overview'");
    expect(content).toContain("pluginId: 'plugin.restaurant.admin'");
    expect(content).toContain("draftId: 'draft.local'");
  });
});
