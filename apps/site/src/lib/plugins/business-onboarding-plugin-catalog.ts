import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';

export const businessOnboardingPluginCategoryOptions = [
  { value: 'all', label: 'All' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'growth', label: 'Growth' },
] as const;

export type BusinessOnboardingPluginFilter =
  (typeof businessOnboardingPluginCategoryOptions)[number]['value'];

type OnboardingPluginCategory =
  | Exclude<BusinessOnboardingPluginFilter, 'all' | 'recommended'>
  | 'other';

const CATEGORY_PRIORITY: OnboardingPluginCategory[] = [
  'operations',
  'inventory',
  'finance',
  'growth',
];

const CATEGORY_SIGNALS: Record<
  Exclude<OnboardingPluginCategory, 'other'>,
  readonly string[]
> = {
  operations: [
    'order',
    'trip',
    'fulfillment',
    'dispatch',
    'route',
    'logistics',
    'delivery',
    'operations',
  ],
  finance: [
    'invoice',
    'ledger',
    'pricing',
    'payment',
    'refund',
    'revenue',
    'tax',
    'finance',
    'sale',
  ],
  inventory: ['inventory', 'stock', 'catalog', 'sku', 'menu', 'product'],
  growth: [
    'customer',
    'campaign',
    'loyalty',
    'retention',
    'segment',
    'marketing',
  ],
};

const EXPLICIT_CATEGORY_SYNONYMS: Record<string, OnboardingPluginCategory> = {
  operation: 'operations',
  operations: 'operations',
  ops: 'operations',
  finance: 'finance',
  financial: 'finance',
  inventory: 'inventory',
  growth: 'growth',
  other: 'other',
};

function normalizeExplicitCategory(
  value: unknown,
): OnboardingPluginCategory | null {
  if (typeof value !== 'string') return null;
  return EXPLICIT_CATEGORY_SYNONYMS[value.trim().toLowerCase()] ?? null;
}

function collectMetadataText(entry: PluginCatalogEntry): string {
  const docs = entry.latestRelease.docs as
    | ({ title?: string; description?: string; category?: unknown } & Record<
        string,
        unknown
      >)
    | undefined;
  const metadata = [
    entry.title,
    entry.description,
    docs?.title,
    docs?.description,
    ...entry.capabilities,
  ];
  return metadata
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join(' ')
    .toLowerCase();
}

function scoreCategory(
  category: Exclude<OnboardingPluginCategory, 'other'>,
  value: string,
) {
  return CATEGORY_SIGNALS[category].reduce((score, signal) => {
    return value.includes(signal) ? score + 1 : score;
  }, 0);
}

export function inferBusinessOnboardingCategory(
  entry: PluginCatalogEntry,
): OnboardingPluginCategory {
  const docs = entry.latestRelease.docs as
    | ({ category?: unknown } & Record<string, unknown>)
    | undefined;
  const explicitCategory = normalizeExplicitCategory(docs?.category);
  if (explicitCategory) return explicitCategory;

  const metadata = collectMetadataText(entry);
  if (!metadata) return 'other';

  let bestCategory: OnboardingPluginCategory = 'other';
  let bestScore = 0;

  for (const category of CATEGORY_PRIORITY) {
    const score = scoreCategory(category, metadata);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestCategory;
}

export function filterBusinessOnboardingCatalog(input: {
  catalog: PluginCatalogEntry[];
  category: BusinessOnboardingPluginFilter;
  recommendedPluginIds: ReadonlySet<string>;
}) {
  const { catalog, category, recommendedPluginIds } = input;
  return catalog.filter((entry) => {
    if (category === 'all') return true;
    if (category === 'recommended') {
      return recommendedPluginIds.has(entry.pluginId);
    }
    return inferBusinessOnboardingCategory(entry) === category;
  });
}
