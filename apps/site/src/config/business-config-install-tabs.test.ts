import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AutoAdminRootFocusedConfigPatch } from '@/config/business-config';
import {
  resolveInstallDrivenSubdomainGuardRule,
  resolveInstallDrivenSubdomains,
  resolveInstallDrivenSubdomainUiLayers,
  resolveInstallDrivenTabs,
} from '@/config/business-config-resolver';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

vi.mock('@/lib/api', () => ({
  api: {
    businessPluginInstall: {
      useGet: () => ({
        data: [],
        isFetched: true,
        isFetching: false,
      }),
    },
    pluginRelease: {
      useGet: () => ({
        data: [],
        isFetched: true,
        isFetching: false,
      }),
    },
  },
}));

vi.mock('@/lib/plugins/marketplace-seed', () => ({
  mergeMarketplaceReleasesWithSeed: (releases: unknown[]) => releases,
}));

let readAutoAdminRootFocusedConfig:
  | ((props: Record<string, unknown>) => {
      tabs: unknown[];
      bindings: Record<string, unknown>;
      systemTabs: Record<string, unknown>;
      dataScopes: Record<string, unknown>;
      bindingCarrierKeys: string[];
      dataScopeCarrierKeys: string[];
    })
  | undefined;
let applyAutoAdminRootFocusedConfigPatch:
  | ((
      props: Record<string, unknown>,
      patch: AutoAdminRootFocusedConfigPatch,
    ) => Record<string, unknown>)
  | undefined;

beforeAll(async () => {
  const helpers = await import('@/config/business-config');
  readAutoAdminRootFocusedConfig = helpers.readAutoAdminRootFocusedConfig;
  applyAutoAdminRootFocusedConfigPatch =
    helpers.applyAutoAdminRootFocusedConfigPatch;
});

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

  it('resolves install-driven subdomains with defaults', () => {
    const subdomains = resolveInstallDrivenSubdomains({
      businessId: 'business-1',
      installs: [install()],
      releases: [
        release({
          adminTabs: [
            { schema: '__plugin_studio_subdomain__/orders' },
            { schema: '__plugin_studio_subdomain__/support' },
          ],
        }),
      ],
    });

    expect(subdomains).toEqual(
      expect.arrayContaining(['index', 'admin', 'orders', 'support']),
    );
  });

  it('injects admin fallback layers when subdomain UI layers are missing', () => {
    const layers = resolveInstallDrivenSubdomainUiLayers({
      businessId: 'business-1',
      subdomain: 'admin',
      installs: [install()],
      releases: [
        release({
          adminTabs: [{ schema: '__plugin_studio_subdomain__/admin' }],
        }),
      ],
    });

    expect(Array.isArray(layers)).toBe(true);
    expect(
      JSON.stringify(layers).includes('AutoAdmin') ||
        JSON.stringify(layers).includes('auto-admin'),
    ).toBe(true);
  });

  it('resolves guardrail rule for a subdomain from installed releases', () => {
    const guardRule = resolveInstallDrivenSubdomainGuardRule({
      businessId: 'business-1',
      subdomain: 'orders',
      installs: [install()],
      releases: [
        release({
          adminTabs: [
            { schema: '__plugin_studio_subdomain__/orders' },
            {
              schema: '__plugin_studio_subdomain_guard__/orders',
              title: 'authenticated-user',
            },
          ],
        }),
      ],
    });

    expect(guardRule).toBe('authenticated-user');
  });

  it('chooses stricter rule when multiple installs target same subdomain', () => {
    const guardRule = resolveInstallDrivenSubdomainGuardRule({
      businessId: 'business-1',
      subdomain: 'orders',
      installs: [
        install({ id: 'business-1::acme.one', pluginId: 'acme.one' }),
        install({ id: 'business-1::acme.two', pluginId: 'acme.two' }),
      ],
      releases: [
        release({
          pluginId: 'acme.one',
          adminTabs: [
            { schema: '__plugin_studio_subdomain__/orders' },
            {
              schema: '__plugin_studio_subdomain_guard__/orders',
              title: 'authenticated-user',
            },
          ],
        }),
        release({
          pluginId: 'acme.two',
          adminTabs: [
            { schema: '__plugin_studio_subdomain__/orders' },
            {
              schema: '__plugin_studio_subdomain_guard__/orders',
              title: 'organization-member',
            },
          ],
        }),
      ],
    });

    expect(guardRule).toBe('organization-member');
  });
});

describe('auto admin root focused config helpers', () => {
  it('reads focused config from mixed object/string carriers', () => {
    if (!readAutoAdminRootFocusedConfig) {
      throw new Error('readAutoAdminRootFocusedConfig is not initialized');
    }

    const focused = readAutoAdminRootFocusedConfig({
      tabs: JSON.stringify([{ title: 'Orders' }]),
      bindings: { orders: 'sales.orders' },
      tabBindings: JSON.stringify({ customers: 'crm.customers' }),
      systemTabs: JSON.stringify({
        dashboard: { title: 'Overview' },
      }),
      dataScopes: { orders: { source: 'orders' } },
    });

    expect(focused.tabs).toEqual([{ title: 'Orders' }]);
    expect(focused.bindings).toEqual({
      orders: 'sales.orders',
      customers: 'crm.customers',
    });
    expect(focused.systemTabs).toEqual({
      dashboard: { title: 'Overview' },
    });
    expect(focused.dataScopes).toEqual({
      orders: { source: 'orders' },
    });
    expect(focused.bindingCarrierKeys).toEqual(['bindings', 'tabBindings']);
    expect(focused.dataScopeCarrierKeys).toEqual(['dataScopes']);
  });

  it('keeps legacy tabBindings carrier when applying bindings patch', () => {
    if (!applyAutoAdminRootFocusedConfigPatch) {
      throw new Error(
        'applyAutoAdminRootFocusedConfigPatch is not initialized',
      );
    }

    const next = applyAutoAdminRootFocusedConfigPatch(
      {
        tabBindings: { orders: 'sales.orders' },
      },
      {
        bindings: { inventory: 'catalog.inventory' },
      },
    );

    expect(next).toEqual({
      tabBindings: { inventory: 'catalog.inventory' },
    });
  });

  it('updates all hybrid binding carriers while preserving storage format', () => {
    if (!applyAutoAdminRootFocusedConfigPatch) {
      throw new Error(
        'applyAutoAdminRootFocusedConfigPatch is not initialized',
      );
    }

    const next = applyAutoAdminRootFocusedConfigPatch(
      {
        bindings: JSON.stringify({ orders: 'sales.orders' }),
        tabBindings: { orders: 'sales.orders' },
      },
      {
        bindings: { customers: 'crm.customers' },
      },
    );

    expect(next.bindings).toBe(JSON.stringify({ customers: 'crm.customers' }));
    expect(next.tabBindings).toEqual({ customers: 'crm.customers' });
  });
});
