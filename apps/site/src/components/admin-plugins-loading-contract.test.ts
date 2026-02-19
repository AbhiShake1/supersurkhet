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

  it('supports marketplace seed fallback while using install rows for ranking', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('mergeMarketplaceReleasesWithSeed');
    expect(source).toContain(
      'buildMarketplaceGroups(catalog, { installs: allInstalls })',
    );
    expect(source).toContain('ensureMarketplaceSeedReleases');
  });
});
