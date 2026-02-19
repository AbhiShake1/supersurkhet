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
  it('shows DB-backed review data notice when no review table exists', () => {
    const content = getRouteContent();

    expect(content).toContain('Ratings and reviews');
    expect(content).toContain('not stored in the database');
    expect(content).not.toContain('first one to review.');
  });
});
