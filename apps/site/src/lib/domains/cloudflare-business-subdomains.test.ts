import { describe, expect, it } from 'vitest';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { collectDesiredBusinessSubdomainHosts } from './cloudflare-business-subdomains';

function releaseDoc(input: {
  id: string;
  pluginId: string;
  version: string;
  adminTabs?: Array<{ schema: string; title?: string }>;
}): PluginReleaseDoc {
  return {
    id: input.id,
    pluginId: input.pluginId,
    version: input.version,
    manifestHash: 'manifest',
    artifactHash: 'artifact',
    author: { userId: 'owner-1' },
    visibility: 'public',
    actionManifest: [],
    schemaDocs: [],
    adminTabs: input.adminTabs,
  } as PluginReleaseDoc;
}

function installDoc(input: {
  businessId: string;
  pluginId: string;
  version: string;
}): BusinessPluginInstallDoc {
  return {
    id: `${input.businessId}::${input.pluginId}`,
    businessId: input.businessId,
    pluginId: input.pluginId,
    version: input.version,
    manifestHash: 'manifest',
    artifactHash: 'artifact',
    installedAt: '2026-02-25T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
  } as BusinessPluginInstallDoc;
}

describe('collectDesiredBusinessSubdomainHosts', () => {
  it('maps plugin subdomain sentinels to business hosts', () => {
    const installs = [
      installDoc({
        businessId: 'acme',
        pluginId: 'plugin.acme',
        version: '1.0.0',
      }),
    ];
    const releases = [
      releaseDoc({
        id: 'plugin.acme@1.0.0',
        pluginId: 'plugin.acme',
        version: '1.0.0',
        adminTabs: [
          { schema: '__plugin_studio_subdomain__/index' },
          { schema: '__plugin_studio_subdomain__/admin' },
          { schema: '__plugin_studio_subdomain__/orders' },
        ],
      }),
    ];

    const hosts = collectDesiredBusinessSubdomainHosts({
      businessSlug: 'acme',
      installs,
      releases,
      baseDomain: 'surfeit.app',
    });

    expect(hosts).toEqual([
      'acme.surfeit.app',
      'admin.acme.surfeit.app',
      'orders.acme.surfeit.app',
    ]);
  });

  it('skips releases that disable dns auto-configuration', () => {
    const installs = [
      installDoc({
        businessId: 'acme',
        pluginId: 'plugin.acme',
        version: '1.0.0',
      }),
    ];
    const releases = [
      releaseDoc({
        id: 'plugin.acme@1.0.0',
        pluginId: 'plugin.acme',
        version: '1.0.0',
        adminTabs: [
          { schema: '__plugin_studio_dns__/cloudflare', title: 'manual' },
          { schema: '__plugin_studio_subdomain__/admin' },
        ],
      }),
    ];

    const hosts = collectDesiredBusinessSubdomainHosts({
      businessSlug: 'acme',
      installs,
      releases,
      baseDomain: 'surfeit.app',
    });

    expect(hosts).toEqual([]);
  });
});
