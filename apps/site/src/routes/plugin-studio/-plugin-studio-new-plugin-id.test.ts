import { describe, expect, it } from 'vitest';
import { resolveNewPluginId } from './-plugin-studio-new-plugin-id';

describe('plugin studio new plugin id helper', () => {
  it('returns base plugin id when it is unused', () => {
    expect(
      resolveNewPluginId({
        basePluginId: 'plugin.sales',
        existingPluginIds: ['plugin.ops'],
      }),
    ).toBe('plugin.sales');
  });

  it('returns next available suffix when base plugin id already exists', () => {
    expect(
      resolveNewPluginId({
        basePluginId: 'plugin.sales',
        existingPluginIds: ['plugin.sales', 'plugin.sales.1', 'plugin.sales.2'],
      }),
    ).toBe('plugin.sales.3');
  });

  it('returns plugin.example when base plugin id is blank', () => {
    expect(
      resolveNewPluginId({
        basePluginId: '   ',
        existingPluginIds: [],
      }),
    ).toBe('plugin.example');
  });
});
