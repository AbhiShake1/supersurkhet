import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugins.tsx',
);

describe('admin plugins loading behavior', () => {
  it('does not hard-block the full page on a raw isLoading gate', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).not.toContain(
      'if (isLoading) return <PluginsPageSkeleton />',
    );
  });

  it('uses DB plugin releases as marketplace source while keeping install ranking rows', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('api.pluginRelease.useGet');
    expect(source).toContain('releaseRows as PluginReleaseDoc[]');
    expect(source).not.toContain('mergeMarketplaceReleasesWithSeed');
    expect(source).not.toContain('ensureMarketplaceSeedReleases');
    expect(source).not.toContain('void ensureMarketplaceSeedReleases');
    expect(source).toContain(
      'buildMarketplaceGroups(catalog, { installs: allInstalls })',
    );
  });
});
