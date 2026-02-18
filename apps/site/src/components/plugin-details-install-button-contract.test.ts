import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugin/$pluginId.tsx',
);

describe('plugin details install button loading affordance', () => {
  it('disables the button and spins icon without using Button loading prop', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).not.toContain('loading={installing}');
    expect(source).toContain("className={cn('mr-2 size-4', installing && 'animate-spin')}");
  });
});
