import { describe, expect, it } from 'vitest';
import {
  PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
  buildPluginStudioSidebarSnapshotStorageKey,
  parsePluginStudioSidebarSnapshot,
  pickLatestPluginStudioSidebarSnapshot,
  shouldApplyPluginStudioSidebarSnapshot,
  type PluginStudioSidebarSnapshot,
  type PluginStudioSystemTabState,
} from './-plugin-studio-sidebar-snapshot';

const DEFAULT_SYSTEM_TABS: PluginStudioSystemTabState = {
  dashboard: { title: 'Dashboard' },
  qr: { title: 'QR Management', group: 'System Configuration' },
  website: { title: 'Website UI', group: 'System Configuration' },
};

describe('plugin studio sidebar snapshot helpers', () => {
  it('builds a stable storage key with encoded identifiers', () => {
    const key = buildPluginStudioSidebarSnapshotStorageKey({
      actorUserId: 'user/abc',
      pluginId: 'plugin.sales',
      draftId: 'draft/123',
    });

    expect(key).toBe(
      'plugin_studio_sidebar_snapshot:user%2Fabc:plugin.sales:draft%2F123',
    );
  });

  it('parses a valid snapshot payload', () => {
    const snapshot: PluginStudioSidebarSnapshot = {
      version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
      pluginId: 'plugin.sales',
      draftId: 'draft-1',
      updatedAt: '2026-02-19T10:00:00.000Z',
      schemaOrder: ['orders'],
      schemaTitleById: { orders: 'Orders' },
      schemaGroupById: { orders: 'Operations' },
      schemaIconNameById: { orders: 'Package' },
      customGroups: ['Operations'],
      groupOrder: ['Operations'],
      systemTabs: {
        dashboard: { title: 'Home' },
        qr: { title: 'QR', group: 'System' },
        website: { title: 'Site', group: 'System', iconName: 'Globe' },
      },
    };

    const parsed = parsePluginStudioSidebarSnapshot({
      raw: JSON.stringify(snapshot),
      defaultSystemTabs: DEFAULT_SYSTEM_TABS,
    });

    expect(parsed).toEqual(snapshot);
  });

  it('returns null for malformed snapshot payloads', () => {
    const parsed = parsePluginStudioSidebarSnapshot({
      raw: JSON.stringify({
        version: 999,
        pluginId: 'plugin.sales',
      }),
      defaultSystemTabs: DEFAULT_SYSTEM_TABS,
    });

    expect(parsed).toBeNull();
  });

  it('picks the most recent valid snapshot from multiple candidates', () => {
    const older = JSON.stringify({
      version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
      pluginId: 'plugin.sales',
      draftId: 'draft-1',
      updatedAt: '2026-02-19T10:00:00.000Z',
      schemaOrder: [],
      schemaTitleById: {},
      schemaGroupById: {},
      schemaIconNameById: {},
      customGroups: [],
      groupOrder: [],
      systemTabs: DEFAULT_SYSTEM_TABS,
    });
    const newer = JSON.stringify({
      version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
      pluginId: 'plugin.sales',
      draftId: 'draft-1',
      updatedAt: '2026-02-19T10:00:01.000Z',
      schemaOrder: ['orders'],
      schemaTitleById: { orders: 'Orders' },
      schemaGroupById: {},
      schemaIconNameById: {},
      customGroups: [],
      groupOrder: [],
      systemTabs: DEFAULT_SYSTEM_TABS,
    });

    const parsed = pickLatestPluginStudioSidebarSnapshot({
      raws: [older, newer, 'not-json'],
      defaultSystemTabs: DEFAULT_SYSTEM_TABS,
    });

    expect(parsed?.updatedAt).toBe('2026-02-19T10:00:01.000Z');
    expect(parsed?.schemaOrder).toEqual(['orders']);
  });

  it('only applies snapshots newer than server revision and matching draft', () => {
    const snapshot: PluginStudioSidebarSnapshot = {
      version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
      pluginId: 'plugin.sales',
      draftId: 'draft-1',
      updatedAt: '2026-02-19T10:00:02.000Z',
      schemaOrder: [],
      schemaTitleById: {},
      schemaGroupById: {},
      schemaIconNameById: {},
      customGroups: [],
      groupOrder: [],
      systemTabs: DEFAULT_SYSTEM_TABS,
    };

    expect(
      shouldApplyPluginStudioSidebarSnapshot({
        snapshot,
        draftId: 'draft-1',
        latestRevisionCreatedAt: '2026-02-19T10:00:01.000Z',
      }),
    ).toBe(true);

    expect(
      shouldApplyPluginStudioSidebarSnapshot({
        snapshot,
        draftId: 'draft-2',
        latestRevisionCreatedAt: '2026-02-19T10:00:01.000Z',
      }),
    ).toBe(false);

    expect(
      shouldApplyPluginStudioSidebarSnapshot({
        snapshot,
        draftId: 'draft-1',
        latestRevisionCreatedAt: '2026-02-19T10:00:02.000Z',
      }),
    ).toBe(false);
  });
});
