import { describe, expect, it } from 'vitest';
import {
  resolvePluginStudioPluginId,
  shouldSyncPluginStudioSearch,
} from './-plugin-studio-plugin-id';

describe('plugin studio plugin id helpers', () => {
  it('prefers plugin id from URL when present', () => {
    expect(
      resolvePluginStudioPluginId({
        searchPluginId: 'plugin.from.url',
        persistedPluginId: 'plugin.from.db',
        fallbackPluginId: 'example.plugin',
      }),
    ).toBe('plugin.from.url');
  });

  it('falls back to persisted plugin id when URL is absent', () => {
    expect(
      resolvePluginStudioPluginId({
        searchPluginId: undefined,
        persistedPluginId: 'plugin.from.db',
        fallbackPluginId: 'example.plugin',
      }),
    ).toBe('plugin.from.db');
  });

  it('falls back to default when URL and persisted plugin ids are absent', () => {
    expect(
      resolvePluginStudioPluginId({
        searchPluginId: undefined,
        persistedPluginId: undefined,
        fallbackPluginId: 'example.plugin',
      }),
    ).toBe('example.plugin');
  });

  it('syncs search when plugin id differs', () => {
    expect(
      shouldSyncPluginStudioSearch({
        pluginId: 'plugin.current',
        searchPluginId: 'plugin.other',
        searchDraftId: undefined,
      }),
    ).toBe(true);
  });

  it('syncs search when legacy draftId is present even if plugin id already matches', () => {
    expect(
      shouldSyncPluginStudioSearch({
        pluginId: 'plugin.current',
        searchPluginId: 'plugin.current',
        searchDraftId: 'draft.legacy',
      }),
    ).toBe(true);
  });

  it('does not sync search when plugin id already matches and draftId is absent', () => {
    expect(
      shouldSyncPluginStudioSearch({
        pluginId: 'plugin.current',
        searchPluginId: 'plugin.current',
        searchDraftId: undefined,
      }),
    ).toBe(false);
  });
});
