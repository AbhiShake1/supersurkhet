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
  it('uses a two-column ratings summary and review composer layout', () => {
    const content = getRouteContent();

    expect(content).toContain(
      'className="grid gap-4 md:grid-cols-[220px_1fr]"',
    );
  });
});
