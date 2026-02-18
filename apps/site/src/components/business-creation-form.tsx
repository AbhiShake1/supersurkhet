import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import {
  buildPluginCatalog,
  type PluginCatalogSort,
} from '@/lib/plugins/admin-plugin-catalog';
import {
  getRecommendedSeedReleaseIds,
  mergeMarketplaceReleasesWithSeed,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import { businessSchema, featureSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import type { SchemaKeys } from '@gta/react-hooks';
import { Link } from '@tanstack/react-router';
import {
  Building,
  CheckCircle,
  Package,
  Search,
  Sparkles,
  Store,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapField } from './ui/autoform/components/MapField';

export const businessCreationSchema = businessSchema
  .pick({
    name: true,
    businessType: true,
    features: true,
    locationCoordinates: true,
  })
  .extend({
    prepopulateData: z.record(z.string(), z.boolean()).optional(),
    selectedPluginReleaseIds: z
      .array(z.string())
      .min(1, 'Install at least one plugin before creating your business.'),
  });

export type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

// Define types for pre-population data
interface PrePopulateItem {
  '#': string;
  title: string;
  price: number;
  category?: string;
  description?: string;
  isActive?: boolean;
}

const featureKeys = Object.keys(
  featureSchema.rawShape,
) as (keyof typeof featureSchema.rawShape)[];

const businessTypeIcons = {
  retail: Store,
};

const businessTypeGroups = {
  'Retail & Commerce': ['retail'],
  'Food & Hospitality': ['food', 'hotel'],
  'Transportation & Logistics': ['logistics', 'ride_sharing'],
  'Real Estate': ['real_estate'],
  Education: ['education'],
  Healthcare: ['healthcare'],
  'Financial Services': ['financial_firm'],
  'Fitness & Recreation': ['gym', 'cinema'],
  'Energy & Utilities': ['petrol_pump'],
  'Community & Cooperatives': ['cooperative'],
  'Professional Services': ['service'],
  Other: ['other'],
};

const recommendedFeatures: Record<
  z.infer<typeof businessSchema.shape.businessType>,
  (keyof typeof featureSchema.rawShape)[]
> = {
  retail: ['product', 'order', 'expense'],
  food: ['menuItem', 'order', 'appointment', 'expense'],
  service: ['service', 'appointment', 'expense'],
  logistics: ['driverProfile', 'trip', 'expense'],
  education: ['studentProfile', 'expense'],
  healthcare: ['service', 'appointment', 'expense'],
  real_estate: ['propertyListing', 'expense'],
  cooperative: ['coOpMemberProfile', 'expense'],
  other: ['expense'],
  hotel: ['hotel', 'order', 'expense'],
  petrol_pump: ['petrolPump', 'expense'],
  gym: ['gym', 'appointment', 'expense'],
  cinema: ['cinema', 'order', 'expense'],
  financial_firm: ['financialFirm', 'appointment', 'expense'],
  ride_sharing: ['rideSharing', 'driverProfile', 'trip', 'expense'],
};

const pluginCategoryById: Record<string, string> = {
  'supersurkhet.plugin.restaurant-admin': 'operations',
  'supersurkhet.plugin.customer-loyalty': 'growth',
  'supersurkhet.plugin.finance-ops': 'finance',
  'supersurkhet.plugin.fulfillment-ops': 'operations',
  'supersurkhet.plugin.catalog-intelligence': 'inventory',
};

const pluginCategoryOptions = [
  { value: 'all', label: 'All' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'growth', label: 'Growth' },
] as const;

interface BusinessCreationFormProps {
  step: number;
  form: UseFormReturn<BusinessCreationValues>;
  setStep: (step: number) => void;
  createdBusiness: z.infer<typeof businessSchema> | undefined;
  isSubmitting: boolean;
}

export function BusinessCreationForm({
  step,
  form,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  isSubmitting,
  createdBusiness,
}: BusinessCreationFormProps) {
  if (step === 3) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Business Created!</h2>
        {createdBusiness && (
          <div className="mt-4 space-y-4">
            <p className="text-lg font-semibold">
              Your business{' '}
              <span className="text-primary">{createdBusiness.name}</span> is
              now online!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link
                  to="/$businessName"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Go to Public Site
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  to="/$businessName/admin"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Go to Admin Dashboard
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link
                  to="/$businessName/admin/plugins"
                  params={{ businessName: createdBusiness.basePath ?? '' }}
                >
                  Open Plugin Manager
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {step === 1 && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Aangan Restaurant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="locationCoordinates"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Location on Map</FormLabel>
                <FormControl>
                  <MapField
                    {...field}
                    label="Set Location on Map"
                    inputProps={{
                      key: 'locationCoordinates',
                      onChange: field.onChange,
                      value: field.value,
                    }}
                    id="locationCoordinates"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="businessType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Type</FormLabel>
                <div className="space-y-6 pt-2">
                  {Object.entries(businessTypeGroups).map(([group, types]) => {
                    const groupTypes = types.filter((type) =>
                      businessSchema.shape.businessType.options.includes(
                        type as z.infer<
                          typeof businessSchema.shape.businessType
                        >,
                      ),
                    );

                    if (groupTypes.length === 0) return null;

                    return (
                      <div key={group} className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {group}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {groupTypes.map((type) => {
                            const isSelected = field.value === type;
                            const Icon =
                              businessTypeIcons[
                              type as keyof typeof businessTypeIcons
                              ] || Building;
                            return (
                              <Card
                                key={type}
                                className={cn(
                                  'relative cursor-pointer',
                                  isSelected
                                    ? 'border-primary shadow-sm'
                                    : 'border-input',
                                  'flex flex-col items-center justify-center p-4 text-center h-full',
                                )}
                                onClick={() => {
                                  field.onChange(type);
                                  const businessType =
                                    type as keyof typeof recommendedFeatures;
                                  const recommended =
                                    recommendedFeatures[businessType] || [];
                                  const newFeatures: Record<string, boolean> =
                                    {};
                                  for (const key of featureKeys) {
                                    newFeatures[key] =
                                      recommended.includes(key);
                                  }
                                  form.setValue('features', newFeatures);
                                }}
                              >
                                <CardHeader className="p-0 flex-grow flex flex-col items-center justify-center gap-2">
                                  <Icon className="h-6 w-6 text-muted-foreground" />
                                  <CardTitle className="capitalize text-sm font-semibold">
                                    {type.replace('_', ' ')}
                                  </CardTitle>
                                </CardHeader>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 text-primary">
                                    <CheckCircle className="h-4 w-4" />
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <PluginInstallSelectionForm form={form} />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Optional data pre-population
            </h3>
            <DataPrepopulateForm form={form} key="prepopulate-form" />
          </div>
        </div>
      )}
    </div>
  );
}

interface DataPrepopulateFormProps {
  form: UseFormReturn<BusinessCreationValues>;
}

function toReleaseId(pluginId: string, version: string) {
  return `${pluginId}@${version}`;
}

function PluginInstallSelectionForm({ form }: DataPrepopulateFormProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof pluginCategoryOptions)[number]['value']>(
    'recommended',
  );
  const [sortBy, setSortBy] = useState<PluginCatalogSort>('recent');
  const businessType = form.watch('businessType');
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = useMemo(
    () => mergeMarketplaceReleasesWithSeed(releaseRows as PluginReleaseDoc[]),
    [releaseRows],
  );

  const recommendedReleaseIds = useMemo(
    () => getRecommendedSeedReleaseIds(businessType),
    [businessType],
  );

  const recommendedPluginIds = useMemo(
    () =>
      new Set(
        recommendedReleaseIds
          .map((releaseId) => parseReleaseId(releaseId)?.pluginId)
          .filter((pluginId): pluginId is string => Boolean(pluginId)),
      ),
    [recommendedReleaseIds],
  );

  const catalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs: [],
        query,
        filter: 'all',
        sort: sortBy,
      }),
    [releases, query, sortBy],
  );

  const visibleCatalog = useMemo(
    () =>
      catalog.filter((entry) => {
        if (category === 'all') return true;
        if (category === 'recommended') {
          return recommendedPluginIds.has(entry.pluginId);
        }
        return (pluginCategoryById[entry.pluginId] ?? 'other') === category;
      }),
    [catalog, category, recommendedPluginIds],
  );

  return (
    <FormField
      control={form.control}
      name="selectedPluginReleaseIds"
      render={({ field }) => {
        const selectedReleaseIds = field.value ?? [];
        const selectedReleaseIdsSet = new Set(selectedReleaseIds);

        const selectedCards = catalog.filter((entry) =>
          selectedReleaseIdsSet.has(
            toReleaseId(entry.pluginId, entry.latestRelease.version),
          ),
        );

        function togglePlugin(entry: (typeof catalog)[number]) {
          const releaseId = toReleaseId(
            entry.pluginId,
            entry.latestRelease.version,
          );
          if (selectedReleaseIdsSet.has(releaseId)) {
            field.onChange(
              selectedReleaseIds.filter((current) => current !== releaseId),
            );
            return;
          }
          field.onChange([...selectedReleaseIds, releaseId]);
        }

        function selectRecommended() {
          const recommendedIds = catalog
            .filter((entry) => recommendedPluginIds.has(entry.pluginId))
            .map((entry) => toReleaseId(entry.pluginId, entry.latestRelease.version));
          if (recommendedIds.length === 0) return;
          field.onChange(
            recommendedIds.filter(
              (id, index) => recommendedIds.indexOf(id) === index,
            ),
          );
        }

        return (
          <FormItem className="space-y-4">
            <div className="space-y-2">
              <FormLabel className="text-base">Plugin stack (required)</FormLabel>
              <p className="text-sm text-muted-foreground">
                Pick the plugins to install as soon as the business is created.
                You need at least one plugin to continue.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-gradient-to-br from-cyan-50/70 via-background to-amber-50/70 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium">
                  <Sparkles className="size-3.5" />
                  Starter plugin marketplace
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={selectRecommended}
                >
                  Apply recommended stack
                </Button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search plugins by name, id, or capability"
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {pluginCategoryOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      type="button"
                      variant={category === option.value ? 'default' : 'outline'}
                      onClick={() => setCategory(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <Select
                  value={sortBy}
                  onValueChange={(value) =>
                    setSortBy(value as PluginCatalogSort)
                  }
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Sort plugins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="capabilities">Capabilities</SelectItem>
                    <SelectItem value="versions">Version count</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCards.length > 0 && (
                <div className="rounded-lg border bg-background/70 p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Install queue ({selectedCards.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCards.map((entry) => {
                      const releaseId = toReleaseId(
                        entry.pluginId,
                        entry.latestRelease.version,
                      );
                      return (
                        <Badge
                          key={releaseId}
                          variant="outline"
                          className="gap-2 py-1"
                        >
                          <Package className="size-3" />
                          {entry.title}@{entry.latestRelease.version}
                          <button
                            type="button"
                            className="rounded-sm px-1 text-muted-foreground hover:bg-muted"
                            onClick={() =>
                              field.onChange(
                                selectedReleaseIds.filter(
                                  (current) => current !== releaseId,
                                ),
                              )
                            }
                          >
                            x
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {visibleCatalog.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No plugins matched this filter.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleCatalog.map((entry) => {
                    const releaseId = toReleaseId(
                      entry.pluginId,
                      entry.latestRelease.version,
                    );
                    const isSelected = selectedReleaseIdsSet.has(releaseId);
                    const isRecommended = recommendedPluginIds.has(entry.pluginId);

                    return (
                      <Card
                        key={releaseId}
                        className={cn(
                          'border-border/70 py-4 gap-3 transition-colors',
                          isSelected && 'border-primary bg-primary/5',
                        )}
                      >
                        <CardHeader className="px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <CardTitle className="text-sm leading-tight">
                                {entry.title}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {entry.pluginId}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {entry.latestRelease.version}
                            </Badge>
                          </div>
                        </CardHeader>
                        <div className="px-4 space-y-3">
                          <p className="text-xs text-muted-foreground min-h-10">
                            {entry.description || 'No description available.'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.capabilities.slice(0, 3).map((capability) => (
                              <Badge
                                key={capability}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {capability}
                              </Badge>
                            ))}
                            {entry.capabilityCount > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{entry.capabilityCount - 3}
                              </Badge>
                            )}
                            {isRecommended && (
                              <Badge className="text-[10px]">Recommended</Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            variant={isSelected ? 'secondary' : 'default'}
                            onClick={() => togglePlugin(entry)}
                          >
                            {isSelected ? 'Installing plugin' : 'Install plugin'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function DataPrepopulateForm({ form }: DataPrepopulateFormProps) {
  const businessType = form.watch('businessType');

  const { data: allItems = [], isLoading } = useBusinessTypeData(businessType);
  const { data: allBusinesses = [] } = api.business.useGet();

  // Transform data as specified in the requirements
  const transformedData = useMemo(
    () =>
      allItems
        .flatMap((d) => {
          const business = d._?.soul;
          return Object.values(d).map((d) =>
            !d || typeof d !== 'object' ? null : { ...d, business },
          );
        })
        .filter((d) => !!d && typeof d === 'object' && !('soul' in d)),
    [allItems],
  );

  // Filter to items and calculate occurrence percentage
  const similarItems = useMemo(() => {
    const businessesOfType = allBusinesses.filter(
      (b) => b.businessType === businessType,
    );

    // Group items by title and calculate occurrence percentage for similar business types
    const itemsByTitle: Record<
      string,
      { count: number; items: PrePopulateItem[]; businesses: string[] }
    > = {};

    for (const d of transformedData) {
      const title = d?.title?.toLowerCase();
      if (!title) continue;

      if (!itemsByTitle[title]) {
        itemsByTitle[title] = { count: 0, items: [], businesses: [] };
      }
      itemsByTitle[title].count++;
      if (!itemsByTitle[title].businesses.includes(d.business)) {
        itemsByTitle[title].businesses.push(d.business);
      }
      if (!businessesOfType.includes(d.business)) {
        businessesOfType.push(d.business);
      }
      // Use the first occurrence of the item to preserve its properties
      itemsByTitle[title].items.push(d);
    }

    const totalBusinesses = businessesOfType.length;

    return Object.values(itemsByTitle)
      .map((data) => {
        // Use the first occurrence of the item as the base to show in the UI
        const commonItem = data.items[0];
        const occurrencePercentage =
          (data.businesses.length / totalBusinesses) * 100;
        return {
          ...commonItem,
          occurrencePercentage,
          isPreselected: occurrencePercentage >= 40,
        };
      })
      .sort((a, b) => b.occurrencePercentage - a.occurrencePercentage) // Sort by most common first
      .filter((item) => item.title);
  }, [transformedData, allBusinesses, businessType]);

  const newSimilarItemsValue = useMemo(
    () =>
      similarItems.reduce(
        (acc, item) => ({
          // biome-ignore lint/performance/noAccumulatingSpread: lint debt cleanup
          ...acc,
          [item['#']]: item.isPreselected,
        }),
        {} as Record<string, boolean>,
      ),
    [similarItems],
  );

  useLayoutEffect(() => {
    for (const [key, val] of Object.entries(newSimilarItemsValue)) {
      form.setValue(`prepopulateData.${key}`, val, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [newSimilarItemsValue, form.setValue]);

  if (isLoading) {
    return <div>Loading pre-population data...</div>;
  }

  if (!similarItems.length) {
    return <div>No similar data found for pre-population.</div>;
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
      key={`${businessType}-similar-items`}
    >
      {similarItems.map(
        (item) =>
          item['#'] && (
            <FormField
              key={item['#']}
              control={form.control}
              name={`prepopulateData.${item['#']}`}
              render={({ field }) => {
                const value = field.value;

                return (
                  <FormItem
                    className={cn(
                      'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors',
                      value && 'border-primary/50 bg-primary/5',
                    )}
                    onClick={(e) => {
                      if (
                        !(e.target as HTMLElement).closest(
                          'input[type="checkbox"]',
                        )
                      ) {
                        field.onChange(!value);
                      }
                    }}
                  >
                    <FormControl>
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>

                    <div className="space-y-1 leading-none flex-1">
                      <span className="capitalize text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.title}
                      </span>

                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        Available at{' '}
                        <span className="font-semibold text-md">
                          {item.occurrencePercentage.toFixed(0)}%
                        </span>{' '}
                        of similar businesses
                      </p>

                      {item.isPreselected && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
                          Recommended
                        </span>
                      )}
                    </div>
                  </FormItem>
                );
              }}
            />
          ),
      )}
    </div>
  );
}

export function getBusinessTypeDataField(
  businessType: string | undefined,
): SchemaKeys {
  switch (businessType) {
    case 'food':
    case 'hotel':
      return 'menuItem';
    case 'retail':
      return 'product';
    case 'service':
    case 'healthcare':
      return 'service';
    case 'education':
      return 'studentProfile';
    case 'logistics':
    case 'ride_sharing':
      return 'driverProfile';
    case 'real_estate':
      return 'propertyListing';
    case 'cooperative':
      return 'coOpMemberProfile';
    case 'petrol_pump':
      return 'petrolPump';
    default:
      return 'menuItem';
  }
}

// Custom hook to fetch data based on business type
function useBusinessTypeData(businessType: string | undefined) {
  const field = getBusinessTypeDataField(businessType);
  return api[field].useGet();
}
