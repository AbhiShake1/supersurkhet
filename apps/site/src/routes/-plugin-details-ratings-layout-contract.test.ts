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

describe('plugin details ratings layout', () => {
  it('keeps the original layout flow but reduces spacing in the ratings summary grid', () => {
    const content = getRouteContent();

    expect(content).toContain(
      'className="grid gap-2 md:grid-cols-[140px_1fr]"',
    );
  });
});
