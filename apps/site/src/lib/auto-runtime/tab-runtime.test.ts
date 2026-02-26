import { describe, expect, it } from 'vitest';
import {
  dedupeAdminTabs,
  normalizeAutoTableTab,
  resolveAdminTabInput,
  resolveIconByName,
} from './tab-runtime';

describe('tab runtime helpers', () => {
  it('resolves known schema metadata and icon lookup', () => {
    const resolved = resolveAdminTabInput({
      schema: 'product',
      slug: 'shop-1',
    });

    expect(resolved.title).toBeTypeOf('string');
    expect(resolved.title.length).toBeGreaterThan(0);
    expect(resolveIconByName('Package')).toBeDefined();
  });

  it('dedupes tabs by normalized title by default', () => {
    const tabs = dedupeAdminTabs([
      resolveAdminTabInput({ title: ' Sales ' }),
      resolveAdminTabInput({ title: 'Sales' }),
      resolveAdminTabInput({ title: 'Inventory' }),
    ]);

    expect(tabs.map((tab) => tab.title)).toEqual(['Sales', 'Inventory']);
  });

  it('supports custom dedupe keys for schema/group-aware parity', () => {
    const tabs = dedupeAdminTabs(
      [
        { schema: 'product', title: 'Plugin Products', group: 'Catalog' },
        { schema: 'order', title: 'Plugin Products', group: 'Catalog' },
      ],
      (tab) => `${tab.schema}:${tab.title ?? ''}:${tab.group ?? ''}`,
    );

    expect(tabs).toHaveLength(2);
  });

  it('normalizes auto table slug only when data is not provided', () => {
    const withSlug = normalizeAutoTableTab(
      {
        schema: 'product',
        title: 'Products',
      },
      'shop-1',
    );
    expect('slug' in withSlug ? withSlug.slug : undefined).toBe('shop-1');

    const withData = normalizeAutoTableTab(
      {
        schema: 'product',
        title: 'Products',
        data: [{ name: 'A' }],
      },
      'shop-1',
    );
    expect(withData).toEqual({
      schema: 'product',
      title: 'Products',
      data: [{ name: 'A' }],
    });
  });
});
