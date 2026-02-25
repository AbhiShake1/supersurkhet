import { describe, expect, it } from 'vitest';
import {
  resolveAfterNextTick,
  resolveLifecycleBusinessId,
} from './lifecycle';

describe('resolveLifecycleBusinessId', () => {
  it('returns undefined when no scope key exists', () => {
    expect(
      resolveLifecycleBusinessId({
        table: 'product',
        restKeys: [],
      }),
    ).toBeUndefined();
  });

  it('skips lifecycle for draft-scoped plugin studio documents', () => {
    expect(
      resolveLifecycleBusinessId({
        table: 'pluginRoutesTabsConfig',
        restKeys: ['draft.example'],
      }),
    ).toBeUndefined();
    expect(
      resolveLifecycleBusinessId({
        table: 'pluginSchemaDoc',
        restKeys: ['draft.example'],
      }),
    ).toBeUndefined();
    expect(
      resolveLifecycleBusinessId({
        table: 'pluginActionManifestDoc',
        restKeys: ['draft.example'],
      }),
    ).toBeUndefined();
  });

  it('keeps lifecycle enabled for business-scoped runtime tables', () => {
    expect(
      resolveLifecycleBusinessId({
        table: 'product',
        restKeys: ['business-1'],
      }),
    ).toBe('business-1');
    expect(
      resolveLifecycleBusinessId({
        table: 'order',
        restKeys: ['business-2'],
      }),
    ).toBe('business-2');
  });

  it('resolves values on the next event loop tick', async () => {
    let settled = false;
    const pending = resolveAfterNextTick('ok').then((value) => {
      settled = true;
      return value;
    });

    expect(settled).toBe(false);
    await expect(pending).resolves.toBe('ok');
    expect(settled).toBe(true);
  });
});
