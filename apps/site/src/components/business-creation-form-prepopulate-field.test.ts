import { describe, expect, it } from 'vitest';
import { getBusinessDataFieldFromSelectedReleases } from '@/lib/plugins/business-onboarding-prepopulate';
import type { PluginReleaseDoc } from '@/lib/plugins/types';

function release(
  id: string,
  adminTabs: Array<{ schema: string; title?: string }> = [],
): PluginReleaseDoc {
  return {
    id,
    pluginId: id.split('@')[0] ?? id,
    version: '1.0.0',
    manifestHash: 'manifest-hash',
    artifactHash: 'artifact-hash',
    author: { userId: 'test-user' },
    visibility: 'public',
    docs: { title: 'Test Plugin' },
    actionManifest: [],
    adminTabs,
    publishedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('business creation prepopulate field resolver', () => {
  it('resolves products when plugin exposes product tab', () => {
    const field = getBusinessDataFieldFromSelectedReleases({
      selectedReleaseIds: ['acme.catalog@1.0.0'],
      releases: [
        release('acme.catalog@1.0.0', [
          { schema: 'product', title: 'Products' },
        ]),
      ],
    });

    expect(field).toBe('product');
  });

  it('returns null when selected plugins do not expose prepopulate-compatible tables', () => {
    const field = getBusinessDataFieldFromSelectedReleases({
      selectedReleaseIds: ['acme.analytics@1.0.0'],
      releases: [
        release('acme.analytics@1.0.0', [
          { schema: 'invoice', title: 'Invoices' },
        ]),
      ],
    });

    expect(field).toBeNull();
  });

  it('ignores plugin studio sentinel tabs for prepopulate resolution', () => {
    const field = getBusinessDataFieldFromSelectedReleases({
      selectedReleaseIds: ['acme.subdomain@1.0.0'],
      releases: [
        release('acme.subdomain@1.0.0', [
          { schema: '__plugin_studio_subdomain__/index' },
          { schema: '__plugin_studio_subdomain_ui__/admin' },
          { schema: '__plugin_studio_dns__/cloudflare' },
        ]),
      ],
    });

    expect(field).toBeNull();
  });
});
