import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/index.tsx',
);

describe('admin empty state plugin onboarding contract', () => {
  it('renders inline plugin onboarding and installs directly from admin', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('Install a plugin to finish setting up');
    expect(source).toContain(
      'Choose at least one plugin to unlock your admin dashboard.',
    );
    expect(source).toContain('installPluginRelease');
    expect(source).toContain("actorUserId={user._?.soul ?? 'anon'}");
    expect(source).toContain('Open full plugin marketplace');
    expect(source).toContain('api.pluginRelease.useGet');
    expect(source).toContain('releaseRows as PluginReleaseDoc[]');
    expect(source).not.toContain('mergeMarketplaceReleasesWithSeed');
  });

  it('shows a loading indicator while plugin-driven tab config resolves', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('if (isConfigLoading)');
    expect(source).toContain('Loading installed plugins...');
  });
});
