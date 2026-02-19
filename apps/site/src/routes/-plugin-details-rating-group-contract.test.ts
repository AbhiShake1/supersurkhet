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

describe('plugin details review data source', () => {
  it('does not render local star rating input when reviews are not DB-backed', () => {
    const content = getRouteContent();

    expect(content).not.toContain(`from '@ark-ui/react/rating-group'`);
    expect(content).not.toContain('<RatingGroup.Root');
    expect(content).toContain('not stored in the database');
  });
});
