import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginDetailsRoutePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugin/$pluginId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginDetailsRoutePath, 'utf8');
}

describe('plugin details empty reviews state', () => {
  it('shows first-review call-to-action when the plugin has no reviews yet', () => {
    const content = getRouteContent();

    expect(content).toContain('Ratings and reviews');
    expect(content).toContain('Be the first one to review this plugin.');
    expect(content).not.toContain('not stored in the database');
  });
});
