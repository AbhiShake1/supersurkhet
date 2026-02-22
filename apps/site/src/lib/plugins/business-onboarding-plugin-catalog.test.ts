import { describe, expect, it } from 'vitest';
import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';
import {
  filterBusinessOnboardingCatalog,
  inferBusinessOnboardingCategory,
} from './business-onboarding-plugin-catalog';

function entry(
  pluginId: string,
  capabilities: string[],
  docs: { title?: string; description?: string } = {},
): PluginCatalogEntry {
  const latestRelease = {
    id: `${pluginId}@1.0.0`,
    pluginId,
    version: '1.0.0',
    docs,
    actionManifest: capabilities.map((capability, index) => ({
      actionId: `${pluginId}.action.${index + 1}`,
      capabilities: [capability],
    })),
    adminTabs: [],
    manifestHash: `manifest-${pluginId}`,
    artifactHash: `artifact-${pluginId}`,
    author: { userId: 'owner-1' },
    visibility: 'public' as const,
    publishedAt: '2026-02-01T00:00:00.000Z',
  };

  return {
    pluginId,
    latestRelease,
    releases: [latestRelease],
    availableVersions: ['1.0.0'],
    isInstalled: false,
    isUpgradable: false,
    capabilityCount: capabilities.length,
    capabilities,
    title: docs.title ?? pluginId,
    description: docs.description ?? '',
    latestPublishedAt: latestRelease.publishedAt,
  };
}

describe('business onboarding plugin catalog helpers', () => {
  it('infers category from plugin metadata instead of plugin id mapping', () => {
    const financePlugin = entry('acme.dynamic-finance', [
      'invoice:write',
      'ledger:read',
    ]);
    const operationsPlugin = entry('acme.dynamic-ops', [
      'order:write',
      'trip:write',
    ]);
    const inventoryPlugin = entry('acme.dynamic-inventory', [
      'inventory:write',
      'stock:read',
    ]);
    const growthPlugin = entry('acme.dynamic-growth', [
      'customer:write',
      'campaign:write',
    ]);

    expect(inferBusinessOnboardingCategory(financePlugin)).toBe('finance');
    expect(inferBusinessOnboardingCategory(operationsPlugin)).toBe(
      'operations',
    );
    expect(inferBusinessOnboardingCategory(inventoryPlugin)).toBe('inventory');
    expect(inferBusinessOnboardingCategory(growthPlugin)).toBe('growth');
  });

  it('filters category tabs using inferred metadata categories', () => {
    const catalog = [
      entry('acme.ops', ['order:write']),
      entry('acme.finance', ['invoice:write']),
      entry('acme.inventory', ['inventory:write']),
      entry('acme.growth', ['campaign:write']),
    ];

    const financeVisible = filterBusinessOnboardingCatalog({
      catalog,
      category: 'finance',
      recommendedPluginIds: new Set<string>(),
    });
    const recommendedVisible = filterBusinessOnboardingCatalog({
      catalog,
      category: 'recommended',
      recommendedPluginIds: new Set<string>(['acme.growth']),
    });

    expect(financeVisible.map((plugin) => plugin.pluginId)).toEqual([
      'acme.finance',
    ]);
    expect(recommendedVisible.map((plugin) => plugin.pluginId)).toEqual([
      'acme.growth',
    ]);
  });
});
