import { describe, expect, it } from 'vitest';
import { resolveReleaseSubdomainSurface } from './subdomain-surface';

describe('resolveReleaseSubdomainSurface', () => {
  it('resolves ordered subdomains and parses subdomain ui layers', () => {
    const result = resolveReleaseSubdomainSurface({
      adminTabs: [
        { schema: '__plugin_studio_subdomain__/index' },
        { schema: '__plugin_studio_subdomain__/admin' },
        { schema: '__plugin_studio_subdomain__/orders' },
        {
          schema: '__plugin_studio_subdomain_ui__/orders',
          title: JSON.stringify([
            {
              id: 'orders-page',
              type: 'img',
              name: 'img',
              props: { src: 'https://cdn.example.com/orders.png' },
              children: [],
            },
          ]),
        },
      ],
    });

    expect(result.subdomains).toEqual(['index', 'admin', 'orders']);
    expect(result.uiLayersBySubdomain.orders).toBeDefined();
    expect(result.imageUrlsBySubdomain.orders).toEqual([
      'https://cdn.example.com/orders.png',
    ]);
  });

  it('injects admin fallback AutoAdmin layers when admin ui is missing', () => {
    const result = resolveReleaseSubdomainSurface({
      adminTabs: [{ schema: '__plugin_studio_subdomain__/admin' }],
    });

    expect(Array.isArray(result.uiLayersBySubdomain.admin)).toBe(true);
    expect(
      JSON.stringify(result.uiLayersBySubdomain.admin ?? []).includes(
        'AutoAdmin',
      ),
    ).toBe(true);
    expect(
      JSON.stringify(result.uiLayersBySubdomain.admin ?? []).includes(
        'min-h-svh w-full bg-background text-foreground',
      ),
    ).toBe(true);
    expect(
      JSON.stringify(result.uiLayersBySubdomain.admin ?? []).includes(
        'px-8 py-10',
      ),
    ).toBe(false);
  });
});
