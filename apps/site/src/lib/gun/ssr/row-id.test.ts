import { describe, expect, it } from 'vitest';
import { createTimestampRowId, normalizeRowId } from './row-id';

describe('gun ssr row id helpers', () => {
  it('creates compact timestamp fallback ids', () => {
    const rowId = createTimestampRowId('pluginRoutesTabsConfig');
    expect(rowId).toMatch(/^pluginroutestabsconfig\.[a-z0-9]+$/);
  });

  it('keeps short safe ids unchanged', () => {
    expect(normalizeRowId('draft.example.live')).toBe('draft.example.live');
  });

  it('falls back to timestamp id when source id is empty', () => {
    const rowId = normalizeRowId('', 'pluginDraftRevision');
    expect(rowId).toMatch(/^plugindraftrevision\.[a-z0-9]+$/);
  });

  it('compacts oversized ids deterministically', () => {
    const oversized = `draft.${'x'.repeat(260)}`;
    const first = normalizeRowId(oversized, 'draft');
    const second = normalizeRowId(oversized, 'draft');
    expect(first.length).toBeLessThanOrEqual(96);
    expect(first).toBe(second);
  });
});

