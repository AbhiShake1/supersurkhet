import { describe, expect, it } from 'vitest';
import {
  mapRoutesTabsToAutoAdminConfig,
  toDeterministicRoutesTabsSnapshot,
} from './routes-tabs-mapper';

describe('routes-tabs-mapper', () => {
  it('maps schema tabs to deterministic auto-admin route configuration', () => {
    const input = {
      businessSlug: 'shop-1',
      tabs: [
        {
          id: 'tab_orders',
          schema: 'order',
          title: 'Orders',
          group: 'Sales',
          icon: 'Package',
          route: 'sales/orders',
          order: 20,
        },
        {
          id: 'tab_customers',
          schema: 'customer',
          title: 'Customers',
          group: 'Sales',
          icon: 'Users',
          order: 10,
        },
        {
          id: 'tab_inventory',
          schema: 'product',
          title: 'Inventory',
          group: 'Catalog',
          order: 15,
        },
      ],
    } as const;

    const mappedA = mapRoutesTabsToAutoAdminConfig(input);
    const mappedB = mapRoutesTabsToAutoAdminConfig({
      ...input,
      tabs: [...input.tabs].reverse(),
    });

    expect(mappedA.diagnostics).toEqual([]);
    expect(mappedA.routes.map((tab) => tab.schema)).toEqual([
      'customer',
      'product',
      'order',
    ]);
    expect(mappedA.routes[0]?.routePath).toBe('/shop-1/customer');
    expect(mappedA.routes[2]?.routePath).toBe('/shop-1/sales/orders');

    expect(toDeterministicRoutesTabsSnapshot(mappedA.routes)).toEqual(
      toDeterministicRoutesTabsSnapshot(mappedB.routes),
    );
  });

  it('detects duplicate route collisions and keeps only the first deterministic winner', () => {
    const mapped = mapRoutesTabsToAutoAdminConfig({
      businessSlug: '/shop-1/',
      tabs: [
        {
          id: 'tab_orders',
          schema: 'order',
          title: 'Orders',
          route: 'sales',
          order: 1,
        },
        {
          id: 'tab_returns',
          schema: 'returns',
          title: 'Returns',
          route: 'sales',
          order: 2,
        },
      ],
    });

    expect(mapped.routes).toHaveLength(1);
    expect(mapped.routes[0]?.schema).toBe('order');
    expect(mapped.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate-route',
        path: ['tabs', 'tab_returns', 'route'],
      }),
    ]);
  });

  it('reports invalid icon names and falls back to no icon for that tab', () => {
    const mapped = mapRoutesTabsToAutoAdminConfig({
      businessSlug: 'shop-1',
      tabs: [
        {
          id: 'tab_stock',
          schema: 'stockImport',
          title: 'Stock Imports',
          icon: 'NotARealIcon',
        },
      ],
    });

    expect(mapped.routes).toHaveLength(1);
    expect(mapped.routes[0]?.icon).toBeUndefined();
    expect(mapped.routes[0]?.iconName).toBeUndefined();
    expect(mapped.diagnostics).toEqual([
      expect.objectContaining({
        code: 'invalid-icon',
        path: ['tabs', 'tab_stock', 'icon'],
      }),
    ]);
  });
});
