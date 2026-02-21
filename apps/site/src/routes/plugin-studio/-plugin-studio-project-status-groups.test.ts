import { describe, expect, it } from 'vitest';
import {
  groupPluginCardsByStatus,
  type PluginCardStatus,
  resolvePluginCardStatus,
} from './-plugin-studio-project-status-groups';

describe('plugin studio project status helpers', () => {
  it('marks plugin as draft when an active draft exists', () => {
    expect(
      resolvePluginCardStatus({
        latestDraftStatus: 'active',
        installStatus: 'active',
      }),
    ).toBe('draft');
  });

  it('marks plugin as paused when no active draft exists and install is paused', () => {
    expect(
      resolvePluginCardStatus({
        latestDraftStatus: undefined,
        installStatus: 'paused',
      }),
    ).toBe('paused');
  });

  it('marks plugin as archived when archived draft exists without install', () => {
    expect(
      resolvePluginCardStatus({
        latestDraftStatus: 'archived',
        installStatus: undefined,
      }),
    ).toBe('archived');
  });

  it('groups plugin cards by status order', () => {
    const grouped = groupPluginCardsByStatus([
      {
        id: 'plugin.ops',
        title: 'ops',
        pluginId: 'plugin.ops',
        status: 'active',
      },
      {
        id: 'plugin.billing',
        title: 'billing',
        pluginId: 'plugin.billing',
        status: 'draft',
      },
      {
        id: 'plugin.warehouse',
        title: 'warehouse',
        pluginId: 'plugin.warehouse',
        status: 'paused',
      },
    ]);

    expect(grouped.map((group) => group.status)).toEqual<PluginCardStatus[]>([
      'draft',
      'active',
      'paused',
    ]);
    expect(grouped[0]?.items.map((card) => card.pluginId)).toEqual([
      'plugin.billing',
    ]);
  });
});
