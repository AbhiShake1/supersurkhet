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

describe('plugin details review rating input', () => {
  it('uses RatingGroup star input instead of numeric rating input', () => {
    const content = getRouteContent();

    expect(content).toContain(`from '@ark-ui/react/rating-group'`);
    expect(content).toContain('<RatingGroup.Root');
    expect(content).toContain('<RatingGroup.Control');
    expect(content).toContain('<RatingGroup.Item');
    expect(content).not.toContain('placeholder="Rating (1-5)"');
    expect(content).not.toContain('<Input type="number" min={1} max={5}');
  });
});
