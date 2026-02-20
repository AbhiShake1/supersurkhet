import type { SchemaKeys } from '@gta/react-hooks';
import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronUp,
  FileUp,
  LoaderCircle,
  Package,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  type ChangeEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
  type AssistantQuickOptionSet,
  deriveTodoProgress,
  mergeSelectedReleaseIds,
  type TodoItem,
} from '@/lib/business-ai-assistant';
import {
  buildPluginCatalog,
  type PluginCatalogSort,
} from '@/lib/plugins/admin-plugin-catalog';
import {
  type BusinessOnboardingPluginFilter,
  businessOnboardingPluginCategoryOptions,
  filterBusinessOnboardingCatalog,
} from '@/lib/plugins/business-onboarding-plugin-catalog';
import { getBusinessDataFieldFromSelectedReleases } from '@/lib/plugins/business-onboarding-prepopulate';
import {
  getRecommendedSeedReleaseIds,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import { businessSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { getBusinessCreationAssistantTurn } from '@/server-functions/ai';
import { MapField } from './ui/autoform/components/MapField';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';

export const businessCreationSchema = businessSchema
  .pick({
    name: true,
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
  isSubmitting: _isSubmitting,
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
                  {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
                  <MapField
                    {...field}
                    label="Set Location on Map"
                    // MapField consumes AutoFormFieldProps, but this route uses it in a RHF form.
                    field={{} as never}
                    path={['locationCoordinates']}
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
  const [category, setCategory] =
    useState<BusinessOnboardingPluginFilter>('recommended');
  const [sortBy, setSortBy] = useState<PluginCatalogSort>('recent');
  const [assistantInput, setAssistantInput] = useState('');
  const [todoExpanded, setTodoExpanded] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<
    Array<{ role: 'assistant' | 'user'; content: string }>
  >([
    {
      role: 'assistant',
      content:
        'Tell me what you want to optimize. I can suggest plugins or propose a scaffold if needed.',
    },
  ]);
  const [quickOptions, setQuickOptions] = useState<AssistantQuickOptionSet>({
    questionId: 'starter',
    prompt: 'Which direction should we optimize first?',
    options: ['Faster operations', 'Higher revenue', 'Better retention'],
    otherOptionLabel: 'Something else (type your own)',
  });
  const [assistantTodoItems, setAssistantTodoItems] = useState<TodoItem[]>([
    {
      id: 'intent',
      title: 'Capture business intent from conversation',
      done: false,
    },
    {
      id: 'suggestions',
      title: 'Generate plugin suggestions from marketplace',
      done: false,
    },
    {
      id: 'selection',
      title: 'Confirm at least one plugin in install queue',
      done: false,
    },
  ]);

  const fileInputId = useId();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );

  const recommendedReleaseIds = useMemo(
    () => getRecommendedSeedReleaseIds(),
    [],
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
      filterBusinessOnboardingCatalog({
        catalog,
        category,
        recommendedPluginIds,
      }),
    [catalog, category, recommendedPluginIds],
  );

  const availableReleaseIds = useMemo(
    () =>
      catalog.map((entry) =>
        toReleaseId(entry.pluginId, entry.latestRelease.version),
      ),
    [catalog],
  );

  const todoProgress = deriveTodoProgress(assistantTodoItems);

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextNames = files.map((file) => file.name);
    setUploadedFileNames((current) => [...current, ...nextNames]);
    toast.success(
      `Attached ${nextNames.length} file${nextNames.length === 1 ? '' : 's'} for AI context.`,
    );
  }

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
            .map((entry) =>
              toReleaseId(entry.pluginId, entry.latestRelease.version),
            );
          if (recommendedIds.length === 0) return;
          field.onChange(
            recommendedIds.filter(
              (id, index) => recommendedIds.indexOf(id) === index,
            ),
          );
        }

        async function runAssistant(prompt: string) {
          const trimmedPrompt = prompt.trim();
          if (!trimmedPrompt) return;

          setIsThinking(true);
          setAssistantInput(trimmedPrompt);
          setAssistantMessages((current) => [
            ...current,
            { role: 'user', content: trimmedPrompt },
          ]);

          try {
            const response = await getBusinessCreationAssistantTurn({
              data: {
                userPrompt: trimmedPrompt,
                selectedReleaseIds,
                availableReleaseIds,
                conversationHistory: assistantMessages,
              },
            });

            field.onChange(
              mergeSelectedReleaseIds(
                selectedReleaseIds,
                response.suggestedReleaseIds,
              ),
            );

            setQuickOptions(response.quickOptions);
            setAssistantTodoItems(response.todoItems);
            setAssistantMessages((current) => [
              ...current,
              { role: 'assistant', content: response.assistantMessage },
            ]);

            if (response.scaffoldProposal) {
              toast.message(
                `Scaffold proposed: ${response.scaffoldProposal.title}`,
              );
            } else if (response.suggestedReleaseIds.length > 0) {
              toast.success(
                `Added ${response.suggestedReleaseIds.length} plugin suggestion${
                  response.suggestedReleaseIds.length === 1 ? '' : 's'
                } from AI assistant.`,
              );
            }
          } catch {
            toast.error('Assistant request failed. Please try again.');
          } finally {
            setIsThinking(false);
          }
        }

        return (
          <FormItem className="space-y-4">
            <div className="rounded-lg border bg-background/60 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">AI Plugin Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    Multistep AI-guided onboarding with keyboard-first controls.
                    Press Ctrl/Cmd+Enter to send, Alt+1/2/3 for quick options.
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Model ready
                </Badge>
              </div>

              <Collapsible open={todoExpanded} onOpenChange={setTodoExpanded}>
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Agent progress
                      </p>
                      <p className="text-sm font-medium truncate">
                        {todoProgress === 100
                          ? 'Ready to create business'
                          : assistantTodoItems.find((item) => !item.done)
                              ?.title}
                      </p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        {todoExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <Progress value={todoProgress} className="h-2" />
                  <CollapsibleContent className="space-y-2 pt-1">
                    {assistantTodoItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full',
                            item.done ? 'bg-green-500' : 'bg-amber-500',
                          )}
                        />
                        {item.title}
                      </div>
                    ))}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {quickOptions.prompt}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickOptions.options.map((option, index) => (
                    <Button
                      key={option}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runAssistant(option)}
                    >
                      <span className="text-[10px] text-muted-foreground mr-1">
                        {index + 1}.
                      </span>
                      {option}
                    </Button>
                  ))}
                  <Badge variant="outline" className="text-xs py-1.5 px-2">
                    {quickOptions.otherOptionLabel}
                  </Badge>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/10 p-2 space-y-2">
                {assistantMessages.slice(-6).map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      'text-xs rounded px-2 py-1',
                      message.role === 'assistant'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary/10 text-primary-foreground',
                    )}
                  >
                    <span className="font-medium mr-1">{message.role}:</span>
                    {message.content}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      (event.metaKey || event.ctrlKey) &&
                      event.key === 'Enter'
                    ) {
                      event.preventDefault();
                      runAssistant(assistantInput);
                      return;
                    }

                    if (event.altKey && ['1', '2', '3'].includes(event.key)) {
                      event.preventDefault();
                      const optionIndex = Number(event.key) - 1;
                      const option = quickOptions.options[optionIndex];
                      if (option) {
                        runAssistant(option);
                      }
                    }
                  }}
                  placeholder="Tell AI what your business needs. Example: We need inventory alerts, recurring billing, and loyalty rewards."
                  className="min-h-24"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => runAssistant(assistantInput)}
                    disabled={isThinking || assistantInput.trim().length === 0}
                    className="gap-2"
                  >
                    {isThinking ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Suggest plugins
                      </>
                    )}
                  </Button>
                  <label className="inline-flex" htmlFor={fileInputId}>
                    <Input
                      id={fileInputId}
                      type="file"
                      placeholder=""
                      className="sr-only"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      asChild
                    >
                      <span>
                        <FileUp className="h-4 w-4" />
                        Attach files
                      </span>
                    </Button>
                  </label>
                  {uploadedFileNames.slice(-2).map((fileName) => (
                    <Badge key={fileName} variant="secondary">
                      {fileName}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">
                  Proposed plugin scaffold if needed:
                </strong>{' '}
                If no exact plugin exists, the assistant can draft a plugin
                proposal and add it to the business creation payload for review.
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <FormLabel className="text-base">
                    Plugin stack (required)
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Choose at least one plugin to install during business
                    creation.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectRecommended}
                >
                  <Sparkles className="mr-1 h-4 w-4" /> Use recommended stack
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative md:col-span-2 xl:col-span-2">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search plugins"
                    className="pl-8"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {businessOnboardingPluginCategoryOptions.map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      type="button"
                      variant={
                        category === option.value ? 'default' : 'outline'
                      }
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
                    const isRecommended = recommendedPluginIds.has(
                      entry.pluginId,
                    );

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
                            {entry.capabilities
                              .slice(0, 3)
                              .map((capability) => (
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
                            {isSelected ? 'Remove from queue' : 'Add to queue'}
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
  const selectedReleaseIds = form.watch('selectedPluginReleaseIds') ?? [];
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );
  const prepopulateField = useMemo(
    () =>
      getBusinessDataFieldFromSelectedReleases({
        selectedReleaseIds,
        releases,
      }),
    [selectedReleaseIds, releases],
  );
  const { data: allItems = [], isLoading } = useBusinessData(
    prepopulateField ?? 'product',
    Boolean(prepopulateField),
  );

  // Transform data as specified in the requirements
  const transformedData = useMemo(
    () =>
      allItems
        .flatMap((row) => {
          const rowRecord = row as Record<string, unknown> & {
            _?: { soul?: string };
          };
          const business = rowRecord._?.soul;
          return Object.values(rowRecord).map((item) =>
            !item || typeof item !== 'object'
              ? null
              : ({
                  ...(item as PrePopulateItem),
                  business,
                } as PrePopulateItem & {
                  business?: string;
                }),
          );
        })
        .filter(
          (
            item,
          ): item is PrePopulateItem & {
            business?: string;
          } => item !== null && typeof item === 'object' && !('soul' in item),
        ),
    [allItems],
  );

  // Filter to items and calculate occurrence percentage
  const similarItems = useMemo(() => {
    const itemsByTitle: Record<
      string,
      {
        items: Array<
          PrePopulateItem & {
            business?: string;
          }
        >;
        businesses: string[];
      }
    > = {};
    const totalBusinessIds = new Set<string>();

    for (const item of transformedData) {
      const title = item?.title?.toLowerCase();
      if (!title) continue;
      const businessId =
        typeof item.business === 'string' ? item.business : undefined;

      if (!itemsByTitle[title]) {
        itemsByTitle[title] = { items: [], businesses: [] };
      }

      if (businessId) {
        totalBusinessIds.add(businessId);
      }

      if (businessId && !itemsByTitle[title].businesses.includes(businessId)) {
        itemsByTitle[title].businesses.push(businessId);
      }
      itemsByTitle[title].items.push(item);
    }

    const totalBusinesses = Math.max(totalBusinessIds.size, 1);

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
  }, [transformedData]);

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

  if (!prepopulateField) {
    return (
      <div>
        Select a plugin that includes a Products or Menu Items table to enable
        pre-population suggestions.
      </div>
    );
  }

  if (!similarItems.length) {
    return <div>No similar data found for pre-population.</div>;
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
      key={`${prepopulateField ?? 'none'}-similar-items`}
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

function useBusinessData(field: SchemaKeys, enabled = true) {
  return api[field].useGet({
    queryOptions: { enabled },
  });
}
