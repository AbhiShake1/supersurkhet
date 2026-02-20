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
  it('uses DB release rows for AI context and avoids manual catalog browsing UI', () => {
    const content = getFormContent();

    expect(content).toContain('api.pluginRelease.useGet');
    expect(content).toContain('availableReleaseIds');
    expect(content).not.toContain('buildPluginCatalog({');
    expect(content).not.toContain('filterBusinessOnboardingCatalog');
    expect(content).not.toContain('getRecommendedSeedReleaseIds');
    expect(content).not.toContain('mergeMarketplaceReleasesWithSeed');
  });
});
