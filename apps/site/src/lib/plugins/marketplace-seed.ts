import type {
  ActionManifestDoc,
  AdminTabDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

export type MarketplaceSeedRelease = {
  pluginId: string;
  version: string;
  docs: {
    title: string;
    description: string;
  };
  actionManifest: ActionManifestDoc[];
  adminTabs: AdminTabDoc[];
  recommendedFor: string[];
};

export const MARKETPLACE_SEED_RELEASES: MarketplaceSeedRelease[] = [
  {
    pluginId: 'supersurkhet.plugin.restaurant-admin',
    version: '1.0.0',
    docs: {
      title: 'Restaurant Admin Core',
      description:
        'Core operations for inventory, invoicing, orders, and trip reconciliation.',
    },
    actionManifest: [
      {
        actionId: 'restaurant.stock.adjust',
        capabilities: ['inventory:write'],
      },
      {
        actionId: 'restaurant.invoice.set-status',
        capabilities: ['invoice:write'],
      },
      { actionId: 'restaurant.order.finalize', capabilities: ['order:write'] },
      { actionId: 'restaurant.trip.reconcile', capabilities: ['trip:write'] },
    ],
    adminTabs: [
      { schema: 'product', title: 'Inventory' },
      { schema: 'stockImport', title: 'Stock Imports' },
      { schema: 'invoice', title: 'Invoices' },
      { schema: 'order', title: 'Orders' },
      { schema: 'trip', title: 'Trips' },
    ],
    recommendedFor: ['retail', 'food', 'hotel'],
  },
  {
    pluginId: 'supersurkhet.plugin.restaurant-admin',
    version: '1.1.0',
    docs: {
      title: 'Restaurant Admin Core',
      description:
        'Enhanced restaurant operations with tighter menu-to-order synchronization.',
    },
    actionManifest: [
      {
        actionId: 'restaurant.stock.adjust',
        capabilities: ['inventory:write'],
      },
      {
        actionId: 'restaurant.invoice.set-status',
        capabilities: ['invoice:write'],
      },
      { actionId: 'restaurant.order.finalize', capabilities: ['order:write'] },
      { actionId: 'restaurant.trip.reconcile', capabilities: ['trip:write'] },
      { actionId: 'restaurant.menu.sync', capabilities: ['menu:write'] },
    ],
    adminTabs: [
      { schema: 'menuItem', title: 'Menu Items' },
      { schema: 'product', title: 'Inventory' },
      { schema: 'invoice', title: 'Invoices' },
      { schema: 'order', title: 'Orders' },
      { schema: 'trip', title: 'Trips' },
    ],
    recommendedFor: ['retail', 'food', 'hotel'],
  },
  {
    pluginId: 'supersurkhet.plugin.customer-loyalty',
    version: '1.0.0',
    docs: {
      title: 'Customer Loyalty',
      description:
        'Customer retention workflows with loyalty tracking and repeat-order nudges.',
    },
    actionManifest: [
      { actionId: 'loyalty.points.add', capabilities: ['customer:write'] },
      {
        actionId: 'loyalty.campaign.trigger',
        capabilities: ['campaign:write'],
      },
      { actionId: 'loyalty.segment.refresh', capabilities: ['customer:read'] },
    ],
    adminTabs: [
      { schema: 'customer', title: 'Customers' },
      { schema: 'sale', title: 'Sales' },
      { schema: 'order', title: 'Orders' },
    ],
    recommendedFor: ['retail', 'food', 'service', 'hotel', 'gym', 'cinema'],
  },
  {
    pluginId: 'supersurkhet.plugin.finance-ops',
    version: '1.0.0',
    docs: {
      title: 'Finance Ops',
      description:
        'Faster financial controls for invoice followups, reconciliation, and revenue audit.',
    },
    actionManifest: [
      { actionId: 'finance.invoice.followup', capabilities: ['invoice:write'] },
      { actionId: 'finance.reconcile.sale', capabilities: ['sale:write'] },
      { actionId: 'finance.ledger.match', capabilities: ['ledger:read'] },
    ],
    adminTabs: [
      { schema: 'invoice', title: 'Invoices' },
      { schema: 'sale', title: 'Sales' },
      { schema: 'party', title: 'Parties' },
    ],
    recommendedFor: [
      'retail',
      'food',
      'service',
      'financial_firm',
      'cooperative',
      'hotel',
    ],
  },
  {
    pluginId: 'supersurkhet.plugin.fulfillment-ops',
    version: '1.0.0',
    docs: {
      title: 'Fulfillment Ops',
      description:
        'Dispatch and fulfillment automations for order status, stock movement, and trip readiness.',
    },
    actionManifest: [
      { actionId: 'fulfillment.order.route', capabilities: ['order:write'] },
      { actionId: 'fulfillment.trip.assign', capabilities: ['trip:write'] },
      {
        actionId: 'fulfillment.stock.allocate',
        capabilities: ['inventory:write'],
      },
    ],
    adminTabs: [
      { schema: 'order', title: 'Orders' },
      { schema: 'trip', title: 'Trips' },
      { schema: 'stockImport', title: 'Stock Imports' },
    ],
    recommendedFor: [
      'retail',
      'logistics',
      'ride_sharing',
      'petrol_pump',
      'hotel',
      'food',
    ],
  },
  {
    pluginId: 'supersurkhet.plugin.catalog-intelligence',
    version: '1.0.0',
    docs: {
      title: 'Catalog Intelligence',
      description:
        'Catalog quality checks and stock analytics for better merchandising decisions.',
    },
    actionManifest: [
      { actionId: 'catalog.sku.audit', capabilities: ['inventory:read'] },
      {
        actionId: 'catalog.restock.predict',
        capabilities: ['inventory:write'],
      },
      { actionId: 'catalog.price.watch', capabilities: ['pricing:read'] },
    ],
    adminTabs: [
      { schema: 'product', title: 'Products' },
      { schema: 'stockImport', title: 'Stock Imports' },
      { schema: 'sale', title: 'Sales' },
    ],
    recommendedFor: ['retail', 'food', 'petrol_pump', 'cooperative', 'other'],
  },
];

const RECOMMENDED_BY_BUSINESS_TYPE: Record<string, string[]> = {
  retail: [
    'supersurkhet.plugin.restaurant-admin@1.1.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
    'supersurkhet.plugin.catalog-intelligence@1.0.0',
  ],
  food: [
    'supersurkhet.plugin.restaurant-admin@1.1.0',
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.fulfillment-ops@1.0.0',
  ],
  service: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  logistics: [
    'supersurkhet.plugin.fulfillment-ops@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  education: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  healthcare: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  real_estate: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  cooperative: [
    'supersurkhet.plugin.finance-ops@1.0.0',
    'supersurkhet.plugin.catalog-intelligence@1.0.0',
  ],
  other: [
    'supersurkhet.plugin.finance-ops@1.0.0',
    'supersurkhet.plugin.customer-loyalty@1.0.0',
  ],
  hotel: [
    'supersurkhet.plugin.restaurant-admin@1.1.0',
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.fulfillment-ops@1.0.0',
  ],
  petrol_pump: [
    'supersurkhet.plugin.fulfillment-ops@1.0.0',
    'supersurkhet.plugin.catalog-intelligence@1.0.0',
  ],
  gym: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  cinema: [
    'supersurkhet.plugin.customer-loyalty@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
  financial_firm: [
    'supersurkhet.plugin.finance-ops@1.0.0',
    'supersurkhet.plugin.customer-loyalty@1.0.0',
  ],
  ride_sharing: [
    'supersurkhet.plugin.fulfillment-ops@1.0.0',
    'supersurkhet.plugin.finance-ops@1.0.0',
  ],
};

const SEED_IDS = new Set(
  MARKETPLACE_SEED_RELEASES.map(
    (release) => `${release.pluginId}@${release.version}`,
  ),
);

export function parseReleaseId(releaseId: string) {
  const splitAt = releaseId.lastIndexOf('@');
  if (splitAt <= 0 || splitAt === releaseId.length - 1) {
    return null;
  }

  const pluginId = releaseId.slice(0, splitAt).trim();
  const version = releaseId.slice(splitAt + 1).trim();

  if (!pluginId || !version) return null;
  return { pluginId, version };
}

export function getRecommendedSeedReleaseIds(businessType: string): string[] {
  const prioritized =
    RECOMMENDED_BY_BUSINESS_TYPE[businessType] ??
    RECOMMENDED_BY_BUSINESS_TYPE.other;

  const unique = prioritized.filter(
    (id, index) => prioritized.indexOf(id) === index,
  );
  const existing = unique.filter((id) => SEED_IDS.has(id));

  if (existing.length > 0) {
    return existing;
  }

  return ['supersurkhet.plugin.finance-ops@1.0.0'];
}

function toSeedReleaseDoc(
  release: MarketplaceSeedRelease,
  index: number,
): PluginReleaseDoc {
  const releaseId = `${release.pluginId}@${release.version}`;
  const safeHashId = releaseId.replaceAll(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const publishedAt = new Date(
    Date.UTC(2025, 0, 1 + index, 9, Math.min(index, 59), 0, 0),
  ).toISOString();

  return {
    id: releaseId,
    pluginId: release.pluginId,
    version: release.version,
    manifestHash: `seed-manifest-${safeHashId}`,
    artifactHash: `seed-artifact-${safeHashId}`,
    author: {
      userId: 'system-seed',
      name: 'Supersurkhet Seed Catalog',
    },
    visibility: 'public',
    docs: release.docs,
    actionManifest: release.actionManifest,
    adminTabs: release.adminTabs,
    publishedAt,
  };
}

export function toMarketplaceSeedReleaseDocs(): PluginReleaseDoc[] {
  return MARKETPLACE_SEED_RELEASES.map((release, index) =>
    toSeedReleaseDoc(release, index),
  );
}

export function mergeMarketplaceReleasesWithSeed(
  releases: PluginReleaseDoc[],
): PluginReleaseDoc[] {
  const mergedById = new Map<string, PluginReleaseDoc>();

  for (const release of toMarketplaceSeedReleaseDocs()) {
    mergedById.set(release.id, release);
  }

  // Live rows should always win over static fallbacks for the same release id.
  for (const release of releases) {
    mergedById.set(release.id, release);
  }

  return [...mergedById.values()];
}
