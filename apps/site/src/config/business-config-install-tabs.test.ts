import { describe, expect, it } from 'vitest';
import { resolveInstallDrivenTabs } from '@/config/business-config-resolver';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

function release(overrides: Partial<PluginReleaseDoc> = {}): PluginReleaseDoc {
  const pluginId = overrides.pluginId ?? 'acme.admin';
  const version = overrides.version ?? '1.0.0';
  return {
    id: `${pluginId}@${version}`,
    pluginId,
    version,
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    author: {
      userId: 'user-1',
    },
    visibility: 'public',
    docs: {
      title: 'Acme Admin Plugin',
    },
    actionManifest: [],
    adminTabs: [
      {
        schema: 'product',
        title: 'Plugin Products',
      },
      {
        schema: 'order',
      },
    ],
    publishedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function install(
  overrides: Partial<BusinessPluginInstallDoc> = {},
): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.admin',
    businessId: 'business-1',
    pluginId: 'acme.admin',
    version: '1.0.0',
    manifestHash: 'manifest-hash-1',
    artifactHash: 'artifact-hash-1',
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
    ...overrides,
  };
}

describe('business config install-driven tab resolver', () => {
  it('returns plugin tabs from installed releases', () => {
    const tabs = resolveInstallDrivenTabs({
      businessId: 'business-1',
      businessSlug: 'shop-1',
      installs: [install()],
      releases: [release()],
    });

    expect(tabs.map((tab) => tab.schema)).toEqual(['product', 'order']);
    expect(tabs[0]?.title).toBe('Plugin Products');
  });

  it('returns empty tabs when no install tabs exist', () => {
    const tabs = resolveInstallDrivenTabs({
      businessId: 'business-1',
      businessSlug: 'shop-1',
      installs: [],
      releases: [],
    });

    expect(tabs).toEqual([]);
  });
});
