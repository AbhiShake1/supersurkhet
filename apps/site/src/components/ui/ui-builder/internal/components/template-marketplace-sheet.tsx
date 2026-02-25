'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  KeyboardShortcutsBoundary,
  ShortcutKbd,
  useShortcutAction,
  type ShortcutDefinition,
} from '@/components/ui/keyboard-shortcuts';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import type {
  BusinessUiTemplateInstallDoc,
  ComponentLayer,
  UiTemplateInstallPreview,
  UiTemplateReleaseDoc,
} from '@/lib/plugins/types';
import {
  installUiTemplateRelease,
  previewUiTemplateInstall,
  publishUiTemplateRelease,
} from '@/server-functions/plugins';

type ActorRole = 'owner' | 'admin' | 'staff';

type TemplateMarketplaceSheetProps = {
  businessId: string;
  actorUserId: string;
  actorRole: ActorRole;
  layers: ComponentLayer[];
  onInstallApplied: (layers: ComponentLayer[]) => void;
};

type PublishDraft = {
  templateSlug: string;
  title: string;
  description: string;
  category: string;
  tags: string;
};

const DEFAULT_PUBLISH_DRAFT: PublishDraft = {
  templateSlug: 'starter',
  title: '',
  description: '',
  category: '',
  tags: '',
};

const TEMPLATE_SHEET_SHORTCUTS = {
  openSheet: {
    id: 'uiBuilder.templates.openSheet',
    label: 'Open templates sheet',
    description: 'Open the UI template marketplace and publish sheet.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: 't',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  switchMarketplaceTab: {
    id: 'uiBuilder.templates.switchMarketplaceTab',
    label: 'Switch to marketplace tab',
    description: 'Switch templates sheet to Marketplace.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: '1',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
  switchPublishTab: {
    id: 'uiBuilder.templates.switchPublishTab',
    label: 'Switch to publish tab',
    description: 'Switch templates sheet to Publish.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: '2',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
  focusMarketplaceSearch: {
    id: 'uiBuilder.templates.focusMarketplaceSearch',
    label: 'Focus template search',
    description: 'Focus search input in template marketplace.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: '/',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  previewInstall: {
    id: 'uiBuilder.templates.previewInstall',
    label: 'Preview template install',
    description: 'Run install preview for selected template version.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  applyTemplate: {
    id: 'uiBuilder.templates.applyTemplate',
    label: 'Apply template install',
    description: 'Install selected template after preview checks pass.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  publishTemplate: {
    id: 'uiBuilder.templates.publishTemplate',
    label: 'Publish template',
    description: 'Publish current builder state as a template release.',
    scope: 'UI Builder Templates',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
} as const satisfies Record<string, ShortcutDefinition>;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

function normalizeErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong';
  }
  const maybeError = error as { message?: unknown };
  if (typeof maybeError.message === 'string') {
    return maybeError.message;
  }
  return 'Something went wrong';
}

function latestByTemplateId(templateReleases: UiTemplateReleaseDoc[]) {
  const map = new Map<string, UiTemplateReleaseDoc>();
  for (const release of templateReleases) {
    const existing = map.get(release.templateId);
    if (!existing || release.version.localeCompare(existing.version) > 0) {
      map.set(release.templateId, release);
    }
  }
  return map;
}

export function TemplateMarketplaceSheet({
  businessId,
  actorUserId,
  actorRole,
  layers,
  onInstallApplied,
}: TemplateMarketplaceSheetProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'publish'>(
    'marketplace',
  );
  const [query, setQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('All');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [preferLatestVersion, setPreferLatestVersion] = useState(true);
  const [preview, setPreview] = useState<UiTemplateInstallPreview | null>(null);
  const [confirmPluginUpdates, setConfirmPluginUpdates] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isInstallLoading, setIsInstallLoading] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [publishedRef, setPublishedRef] = useState('');
  const [publishDraft, setPublishDraft] =
    useState<PublishDraft>(DEFAULT_PUBLISH_DRAFT);
  const [slugTouched, setSlugTouched] = useState(false);
  const marketplaceSearchRef = useRef<HTMLInputElement | null>(null);

  const templateVersionId = useId();
  const pluginUpdateConfirmId = useId();
  const preferLatestId = useId();
  const categoryDatalistId = useId();
  const draftStorageKey = `ui-template-publish-draft:${businessId}`;

  const { data: templateRows = [] } = api.uiTemplateRelease.useGet();
  const templateReleases = templateRows as UiTemplateReleaseDoc[];
  const { data: installRows = [] } = api.businessUiTemplateInstall.useGet({
    keys: [businessId],
  });
  const installedTemplates = installRows as BusinessUiTemplateInstallDoc[];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      return;
    }
    const raw = storage.getItem(draftStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<PublishDraft>;
      setPublishDraft((current) => ({
        ...current,
        ...parsed,
      }));
      if (parsed.templateSlug?.trim()) {
        setSlugTouched(true);
      }
    } catch (_error) {
      // no-op
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      return;
    }
    storage.setItem(draftStorageKey, JSON.stringify(publishDraft));
  }, [draftStorageKey, publishDraft]);

  const templatesById = useMemo(() => {
    const map = new Map<string, UiTemplateReleaseDoc[]>();
    for (const release of templateReleases) {
      const existing = map.get(release.templateId) ?? [];
      existing.push(release);
      map.set(release.templateId, existing);
    }
    for (const [templateId, versions] of map) {
      versions.sort((left, right) => right.version.localeCompare(left.version));
      map.set(templateId, versions);
    }
    return map;
  }, [templateReleases]);

  const latestReleaseMap = useMemo(
    () => latestByTemplateId(templateReleases),
    [templateReleases],
  );

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const release of latestReleaseMap.values()) {
      if (release.docs.category?.trim()) {
        categories.add(release.docs.category.trim());
      }
    }
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [latestReleaseMap]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const release of latestReleaseMap.values()) {
      for (const tag of release.docs.tags ?? []) {
        const normalized = tag.trim();
        if (normalized) tags.add(normalized);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [latestReleaseMap]);

  const visibleTemplateEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...templatesById.entries()]
      .filter(([templateId, releases]) => {
        const latest = releases[0];
        if (!latest) return false;
        if (
          selectedCategoryFilter !== 'All' &&
          latest.docs.category !== selectedCategoryFilter
        ) {
          return false;
        }
        if (
          selectedTagFilter !== 'All' &&
          !(latest.docs.tags ?? []).includes(selectedTagFilter)
        ) {
          return false;
        }
        if (!normalized) return true;
        const haystack = [
          templateId,
          latest.docs.title,
          latest.docs.description,
          latest.docs.category,
          ...(latest.docs.tags ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((left, right) => {
        const leftLatest = left[1][0];
        const rightLatest = right[1][0];
        return (rightLatest?.publishedAt ?? '').localeCompare(
          leftLatest?.publishedAt ?? '',
        );
      });
  }, [
    query,
    selectedCategoryFilter,
    selectedTagFilter,
    templatesById,
  ]);

  const selectedReleases = templatesById.get(selectedTemplateId) ?? [];
  const resolvedVersion = preferLatestVersion
    ? (selectedReleases[0]?.version ?? '')
    : (selectedVersion || selectedReleases[0]?.version || '');

  const selectedRelease = selectedReleases.find(
    (release) => release.version === resolvedVersion,
  );

  const pagesInBuilder = layers.length;
  const layerTagsSuggestion = useMemo(
    () =>
      layers
        .map((layer) => layer.name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, 5),
    [layers],
  );

  const pluginsInSelectedTemplate = selectedRelease?.pluginBundles?.length ?? 0;

  useShortcutAction(TEMPLATE_SHEET_SHORTCUTS.openSheet, () => {
    setOpen(true);
  });

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.switchMarketplaceTab,
    () => {
      setActiveTab('marketplace');
    },
    {
      enabled: open,
    },
  );

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.switchPublishTab,
    () => {
      setActiveTab('publish');
    },
    {
      enabled: open,
    },
  );

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.focusMarketplaceSearch,
    () => {
      marketplaceSearchRef.current?.focus();
      marketplaceSearchRef.current?.select();
    },
    {
      enabled: open && activeTab === 'marketplace',
    },
  );

  async function handlePreviewInstall() {
    if (!selectedTemplateId) {
      toast.error('Select a template first');
      return;
    }
    setIsPreviewLoading(true);
    try {
      const response = await previewUiTemplateInstall({
        data: {
          businessId,
          templateId: selectedTemplateId,
          version: resolvedVersion || undefined,
        },
      });
      setPreview(response);
      setConfirmPluginUpdates(false);
      if (response.hardConflicts.length > 0) {
        toast.error('Hard conflicts found. Resolve conflicts before install.');
      } else {
        toast.success('Install preview ready');
      }
    } catch (error) {
      console.error(error);
      toast.error(normalizeErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleInstall() {
    if (!preview || !selectedTemplateId) return;
    setIsInstallLoading(true);
    try {
      const response = await installUiTemplateRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          templateId: selectedTemplateId,
          version: preview.version,
          confirmPluginUpdates,
        },
      });
      if (Array.isArray(response.layers)) {
        onInstallApplied(response.layers as ComponentLayer[]);
      }
      toast.success(`Installed ${preview.templateId}@${preview.version}`);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(normalizeErrorMessage(error));
    } finally {
      setIsInstallLoading(false);
    }
  }

  async function handlePublish() {
    if (
      !publishDraft.title.trim() ||
      !publishDraft.description.trim() ||
      !publishDraft.templateSlug.trim()
    ) {
      toast.error('Template slug, title, and description are required');
      return;
    }
    if (layers.length === 0) {
      toast.error('Add at least one page before publishing a template');
      return;
    }
    setIsPublishLoading(true);
    try {
      const templateId = `${businessId}/${publishDraft.templateSlug.trim()}`;
      const response = await publishUiTemplateRelease({
        data: {
          actorUserId,
          businessId,
          templateId,
          docs: {
            title: publishDraft.title.trim(),
            description: publishDraft.description.trim(),
            category: publishDraft.category.trim() || undefined,
            tags: publishDraft.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          },
          layers,
        },
      });
      const ref = `${response.release.templateId}@${response.release.version}`;
      setPublishedRef(ref);
      toast.success(`Published ${ref}`);
    } catch (error) {
      console.error(error);
      toast.error(normalizeErrorMessage(error));
    } finally {
      setIsPublishLoading(false);
    }
  }

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.previewInstall,
    () => {
      void handlePreviewInstall();
    },
    {
      enabled:
        open &&
        activeTab === 'marketplace' &&
        Boolean(selectedTemplateId) &&
        !isPreviewLoading,
    },
  );

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.applyTemplate,
    () => {
      void handleInstall();
    },
    {
      enabled:
        open &&
        activeTab === 'marketplace' &&
        Boolean(preview) &&
        !isInstallLoading &&
        preview?.hardConflicts.length === 0 &&
        (!preview?.requiresPluginUpdateConfirmation || confirmPluginUpdates),
    },
  );

  useShortcutAction(
    TEMPLATE_SHEET_SHORTCUTS.publishTemplate,
    () => {
      void handlePublish();
    },
    {
      enabled: open && activeTab === 'publish' && !isPublishLoading,
      allowInEditableContext: true,
    },
  );

  return (
    <KeyboardShortcutsBoundary>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open Templates">
                Templates
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2">
              <span>Open templates</span>
              <ShortcutKbd
                actionId={TEMPLATE_SHEET_SHORTCUTS.openSheet.id}
                interactive={false}
              />
            </TooltipContent>
          </Tooltip>
        </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>UI Templates</SheetTitle>
          <SheetDescription>
            Install from marketplace or publish this builder snapshot as an immutable
            template release.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{templatesById.size} templates</Badge>
            <Badge variant="secondary">{templateReleases.length} total versions</Badge>
            <Badge variant="secondary">{installedTemplates.length} installed here</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Shortcut settings</span>
            <ShortcutKbd
              actionId={TEMPLATE_SHEET_SHORTCUTS.openSheet.id}
              interaction="open-settings"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'marketplace' | 'publish')}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Switch to marketplace</span>
                <ShortcutKbd
                  actionId={TEMPLATE_SHEET_SHORTCUTS.switchMarketplaceTab.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="publish">Publish</TabsTrigger>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Switch to publish</span>
                <ShortcutKbd
                  actionId={TEMPLATE_SHEET_SHORTCUTS.switchPublishTab.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-4">
            <Input
              ref={marketplaceSearchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, id, category, tags"
            />
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>Focus search</span>
              <ShortcutKbd
                actionId={TEMPLATE_SHEET_SHORTCUTS.focusMarketplaceSearch.id}
                interactive={false}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategoryFilter === 'All' ? 'default' : 'outline'}
                onClick={() => setSelectedCategoryFilter('All')}
              >
                All categories
              </Button>
              {availableCategories.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategoryFilter === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategoryFilter(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedTagFilter === 'All' ? 'default' : 'outline'}
                onClick={() => setSelectedTagFilter('All')}
              >
                All tags
              </Button>
              {availableTags.slice(0, 12).map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant={selectedTagFilter === tag ? 'default' : 'outline'}
                  onClick={() => setSelectedTagFilter(tag)}
                >
                  #{tag}
                </Button>
              ))}
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-2">
              {visibleTemplateEntries.map(([templateId, releases]) => {
                const latest = releases[0];
                const installRow = installedTemplates.find(
                  (entry) => entry.templateId === templateId,
                );
                return (
                  <button
                    type="button"
                    key={templateId}
                    className={`w-full rounded-md border p-3 text-left ${
                      selectedTemplateId === templateId
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => {
                      setSelectedTemplateId(templateId);
                      setSelectedVersion(releases[0]?.version ?? '');
                      setPreferLatestVersion(true);
                      setPreview(null);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {latest?.docs.title || templateId}
                      </p>
                      <div className="flex gap-1">
                        <Badge variant="outline">latest {latest?.version}</Badge>
                        {installRow && (
                          <Badge variant="secondary">
                            installed {installRow.version}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{templateId}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {latest?.docs.category ? (
                        <Badge variant="secondary">{latest.docs.category}</Badge>
                      ) : null}
                      {(latest?.docs.tags ?? []).slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
              {visibleTemplateEntries.length === 0 && (
                <p className="text-sm text-muted-foreground px-2 py-4">
                  No templates found.
                </p>
              )}
            </div>

            {selectedTemplateId && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <label htmlFor={templateVersionId} className="text-sm font-medium">
                    Version
                  </label>
                  <label
                    htmlFor={preferLatestId}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Checkbox
                      id={preferLatestId}
                      checked={preferLatestVersion}
                      onCheckedChange={(checked) => {
                        setPreferLatestVersion(Boolean(checked));
                        setPreview(null);
                      }}
                    />
                    Use latest
                  </label>
                </div>
                <select
                  id={templateVersionId}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={resolvedVersion}
                  disabled={preferLatestVersion}
                  onChange={(event) => {
                    setSelectedVersion(event.target.value);
                    setPreview(null);
                  }}
                >
                  {selectedReleases.map((release) => (
                    <option key={release.id} value={release.version}>
                      {release.version}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md border p-2">
                    <p>Pages in template</p>
                    <p className="text-foreground font-semibold">
                      {selectedRelease?.uiSnapshot?.layers
                        ? JSON.parse(selectedRelease.uiSnapshot.layers).length
                        : 0}
                    </p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p>Plugins bundled</p>
                    <p className="text-foreground font-semibold">
                      {pluginsInSelectedTemplate}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePreviewInstall}
                      disabled={isPreviewLoading}
                      className="w-full"
                    >
                      {isPreviewLoading ? 'Loading preview...' : 'Preview Install'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>Run install preview</span>
                    <ShortcutKbd
                      actionId={TEMPLATE_SHEET_SHORTCUTS.previewInstall.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {preview && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-semibold">
                  Install Preview: {preview.templateId}@{preview.version}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border p-2">
                    <p className="text-muted-foreground">Pages added</p>
                    <p className="font-semibold">{preview.mergeSummary.pagesAdded}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <p className="text-muted-foreground">Pages merged</p>
                    <p className="font-semibold">{preview.mergeSummary.pagesMerged}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Plugin plan</p>
                  <p className="text-muted-foreground">
                    Install: {preview.pluginPlan.install.length} | Update:{' '}
                    {preview.pluginPlan.update.length} | No-op:{' '}
                    {preview.pluginPlan.noOp.length}
                  </p>
                  <div className="space-y-1">
                    {preview.pluginPlan.install.map((item) => (
                      <div
                        key={`install:${item.pluginId}`}
                        className="rounded-md border px-2 py-1"
                      >
                        + {item.pluginId}@{item.version}
                        {item.releaseMissingInTarget
                          ? ' (release will be hydrated)'
                          : ''}
                      </div>
                    ))}
                    {preview.pluginPlan.update.map((item) => (
                      <div
                        key={`update:${item.pluginId}`}
                        className="rounded-md border px-2 py-1"
                      >
                        ~ {item.pluginId} {item.fromVersion} {'->'} {item.toVersion}
                        {item.releaseMissingInTarget
                          ? ' (release will be hydrated)'
                          : ''}
                      </div>
                    ))}
                  </div>
                </div>

                {preview.requiresPluginUpdateConfirmation && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
                    <label
                      htmlFor={pluginUpdateConfirmId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={confirmPluginUpdates}
                        onCheckedChange={(checked) =>
                          setConfirmPluginUpdates(Boolean(checked))
                        }
                        id={pluginUpdateConfirmId}
                      />
                      Confirm plugin version updates before applying template
                    </label>
                  </div>
                )}

                {preview.hardConflicts.length > 0 && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2">
                    <p className="text-sm font-semibold text-destructive">
                      Hard conflicts ({preview.hardConflicts.length})
                    </p>
                    <ul className="mt-1 text-xs text-destructive space-y-1 max-h-36 overflow-y-auto">
                      {preview.hardConflicts.map((conflict) => (
                        <li key={`${conflict.code}:${conflict.path}`}>
                          [{conflict.code}] {conflict.path}: {conflict.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleInstall}
                      disabled={
                        isInstallLoading ||
                        preview.hardConflicts.length > 0 ||
                        (preview.requiresPluginUpdateConfirmation &&
                          !confirmPluginUpdates)
                      }
                      className="w-full"
                    >
                      {isInstallLoading ? 'Applying template...' : 'Apply Template'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>Apply template install</span>
                    <ShortcutKbd
                      actionId={TEMPLATE_SHEET_SHORTCUTS.applyTemplate.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </TabsContent>

          <TabsContent value="publish" className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2">
                <p className="text-muted-foreground">Pages to snapshot</p>
                <p className="font-semibold">{pagesInBuilder}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-muted-foreground">Suggested tags</p>
                <p className="font-semibold">{layerTagsSuggestion.length}</p>
              </div>
            </div>

            <Input
              value={publishDraft.templateSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setPublishDraft((current) => ({
                  ...current,
                  templateSlug: slugify(event.target.value),
                }));
              }}
              placeholder="Template slug (e.g. starter)"
            />
            <Input
              value={publishDraft.title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setPublishDraft((current) => ({
                  ...current,
                  title: nextTitle,
                  templateSlug: slugTouched
                    ? current.templateSlug
                    : slugify(nextTitle) || current.templateSlug,
                }));
              }}
              placeholder="Template title"
            />
            <Textarea
              value={publishDraft.description}
              onChange={(event) =>
                setPublishDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Template description"
            />
            <Input
              value={publishDraft.category}
              onChange={(event) =>
                setPublishDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              placeholder="Category (optional)"
              list={categoryDatalistId}
            />
            <datalist id={categoryDatalistId}>
              {availableCategories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <Input
              value={publishDraft.tags}
              onChange={(event) =>
                setPublishDraft((current) => ({
                  ...current,
                  tags: event.target.value,
                }))
              }
              placeholder="Tags comma-separated (optional)"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPublishDraft((current) => ({
                    ...current,
                    tags: layerTagsSuggestion.join(', '),
                  }))
                }
              >
                Use page names as tags
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPublishDraft(DEFAULT_PUBLISH_DRAFT);
                  setSlugTouched(false);
                }}
              >
                Reset form
              </Button>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishLoading || layers.length === 0}
                  className="w-full"
                >
                  {isPublishLoading ? 'Publishing...' : 'Publish Template'}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>Publish current builder as template</span>
                <ShortcutKbd
                  actionId={TEMPLATE_SHEET_SHORTCUTS.publishTemplate.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            {publishedRef && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Published</p>
                <p className="text-muted-foreground break-all">{publishedRef}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(publishedRef);
                      toast.success('Template reference copied');
                    }}
                  >
                    Copy Reference
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('marketplace');
                      const [templateId] = publishedRef.split('@');
                      if (templateId) {
                        setSelectedTemplateId(templateId);
                        setPreferLatestVersion(true);
                      }
                    }}
                  >
                    Open in Marketplace
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
      </Sheet>
    </KeyboardShortcutsBoundary>
  );
}
