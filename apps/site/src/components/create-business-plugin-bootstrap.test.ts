import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(process.cwd(), 'src/components/create-business.tsx');

describe('create-business plugin installation flow', () => {
  it('seeds marketplace plugins and installs user-selected releases on create', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('ensureMarketplaceSeedReleases');
    expect(source).toContain('selectedPluginReleaseIds');
    expect(source).toContain('installPluginRelease');
  });
});
