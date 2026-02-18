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
  it('shows plugin-specific call-to-action when there are no reviews', () => {
    const content = getRouteContent();

    expect(content).toContain('pluginData.title');
    expect(content).toContain('has no reviews yet.');
    expect(content).toContain('first one to review.');
    expect(content).not.toContain(
      'No reviews yet. Be the first to leave feedback.',
    );
  });
});
