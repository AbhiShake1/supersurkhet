import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const businessCreationFormPath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

function getFormContent() {
  return readFileSync(businessCreationFormPath, 'utf8');
}

describe('business creation plugin catalog data source', () => {
  it('uses DB release rows and renders a plugin browser in step 3', () => {
    const content = getFormContent();

    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('selectedReleaseIds');
    expect(content).toContain('Browse and choose plugins before launch');
    expect(content).toContain('Search plugins by name, id, or version');
    expect(content).not.toContain('buildPluginCatalog({');
    expect(content).not.toContain('filterBusinessOnboardingCatalog');
    expect(content).not.toContain('getRecommendedSeedReleaseIds');
    expect(content).not.toContain('mergeMarketplaceReleasesWithSeed');
  });
});
