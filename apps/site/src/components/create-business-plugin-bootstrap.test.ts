import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(process.cwd(), 'src/components/create-business.tsx');

describe('create-business plugin installation flow', () => {
  it('syncs user-selected releases on create from DB release rows only', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).not.toContain('ensureMarketplaceSeedReleases');
    expect(source).toContain('api.pluginRelease.useGet');
    expect(source).toContain('releaseRows as PluginReleaseDoc[]');
    expect(source).not.toContain('mergeMarketplaceReleasesWithSeed');
    expect(source).toContain('selectedPluginReleaseIds');
    expect(source).toContain('syncBusinessPluginInstalls');
  });
});
