'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  KeyboardShortcutsBoundary,
  ShortcutKbd,
  useShortcutAction,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TemplateInstallHistoryPanel } from '@/components/ui/ui-builder/internal/templates/history/template-install-history-panel';
import { TemplateInstallPreviewPanel } from '@/components/ui/ui-builder/internal/templates/install/template-install-preview-panel';
import {
  TemplateMarketplacePanel,
  type TemplateMarketplaceSelection,
} from '@/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-panel';
import { TemplatePublishPanel } from '@/components/ui/ui-builder/internal/templates/publish/template-publish-panel';
import {
  TemplateShortcutHint,
  TemplateShortcutSettingsEntry,
} from '@/components/ui/ui-builder/internal/templates/shortcuts/template-shortcut-hints';
import {
  TEMPLATE_SHORTCUTS,
  type TemplateSheetTab,
} from '@/components/ui/ui-builder/internal/templates/shortcuts/template-shortcuts';
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
  const [activeTab, setActiveTab] = useState<TemplateSheetTab>('marketplace');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [resolvedVersion, setResolvedVersion] = useState<string>('');
  const [preview, setPreview] = useState<UiTemplateInstallPreview | null>(null);
  const [confirmPluginUpdates, setConfirmPluginUpdates] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isInstallLoading, setIsInstallLoading] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [publishedRef, setPublishedRef] = useState('');
  const marketplaceSearchRef = useRef<HTMLInputElement | null>(null);

  const { data: templateRows = [] } = api.uiTemplateRelease.useGet();
  const templateReleases = templateRows as UiTemplateReleaseDoc[];
  const { data: installRows = [] } = api.businessUiTemplateInstall.useGet({
    keys: [businessId],
  });
  const installedTemplates = installRows as BusinessUiTemplateInstallDoc[];

  const latestReleaseMap = useMemo(
    () => latestByTemplateId(templateReleases),
    [templateReleases],
  );
  const templateCount = latestReleaseMap.size;

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const release of latestReleaseMap.values()) {
      if (release.docs.category?.trim()) {
        categories.add(release.docs.category.trim());
      }
    }
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [latestReleaseMap]);

  useShortcutAction(TEMPLATE_SHORTCUTS.openSheet, () => {
    setOpen(true);
  });

  useShortcutAction(
    TEMPLATE_SHORTCUTS.switchMarketplaceTab,
    () => {
      setActiveTab('marketplace');
    },
    {
      enabled: open,
    },
  );

  useShortcutAction(
    TEMPLATE_SHORTCUTS.switchPublishTab,
    () => {
      setActiveTab('publish');
    },
    {
      enabled: open,
    },
  );

  useShortcutAction(
    TEMPLATE_SHORTCUTS.focusMarketplaceSearch,
    () => {
      marketplaceSearchRef.current?.focus();
      marketplaceSearchRef.current?.select();
    },
    {
      enabled: open && activeTab === 'marketplace',
    },
  );

  async function handlePreviewInstall(
    selection?: TemplateMarketplaceSelection,
  ) {
    const templateId = selection?.templateId ?? selectedTemplateId;
    const version = selection?.resolvedVersion ?? resolvedVersion;
    if (!templateId) {
      toast.error('Select a template first');
      return;
    }
    if (selection) {
      setSelectedTemplateId(selection.templateId);
      setResolvedVersion(selection.resolvedVersion);
    }
    setIsPreviewLoading(true);
    try {
      const response = await previewUiTemplateInstall({
        data: {
          businessId,
          templateId,
          version: version || undefined,
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

  async function handlePublish(draft: {
    templateSlug: string;
    title: string;
    description: string;
    category: string;
    tags: string;
  }) {
    setIsPublishLoading(true);
    try {
      const templateId = `${businessId}/${draft.templateSlug.trim()}`;
      const response = await publishUiTemplateRelease({
        data: {
          actorUserId,
          businessId,
          templateId,
          docs: {
            title: draft.title.trim(),
            description: draft.description.trim(),
            category: draft.category.trim() || undefined,
            tags: draft.tags
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
    TEMPLATE_SHORTCUTS.previewInstall,
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
    TEMPLATE_SHORTCUTS.applyTemplate,
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

  return (
    <KeyboardShortcutsBoundary>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open Templates">
                Templates
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Open templates</span>
            <ShortcutKbd
              actionId={TEMPLATE_SHORTCUTS.openSheet.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
        <SheetContent
          side="right"
          className="w-full sm:max-w-3xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>UI Templates</SheetTitle>
            <SheetDescription>
              Install from marketplace or publish this builder snapshot as an
              immutable template release.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{templateCount} templates</Badge>
              <Badge variant="secondary">
                {templateReleases.length} total versions
              </Badge>
              <Badge variant="secondary">
                {installedTemplates.length} installed here
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <TemplateShortcutSettingsEntry />
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TemplateSheetTab)}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TemplateShortcutHint
                label="Switch to marketplace"
                actionId={TEMPLATE_SHORTCUTS.switchMarketplaceTab.id}
              >
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              </TemplateShortcutHint>
              <TemplateShortcutHint
                label="Switch to publish"
                actionId={TEMPLATE_SHORTCUTS.switchPublishTab.id}
              >
                <TabsTrigger value="publish">Publish</TabsTrigger>
              </TemplateShortcutHint>
            </TabsList>

            <TabsContent value="marketplace" className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Focus search</span>
                <ShortcutKbd
                  actionId={TEMPLATE_SHORTCUTS.focusMarketplaceSearch.id}
                  interactive={false}
                />
              </div>
              <TemplateMarketplacePanel
                templateReleases={templateReleases}
                installedTemplates={installedTemplates}
                searchInputRef={marketplaceSearchRef}
                selectedTemplateId={selectedTemplateId}
                isPreviewLoading={isPreviewLoading}
                onSelectionChange={(selection) => {
                  setSelectedTemplateId(selection.templateId);
                  setResolvedVersion(selection.resolvedVersion);
                  setPreview(null);
                }}
                onPreviewInstall={(selection) => {
                  void handlePreviewInstall(selection);
                }}
              />

              <TemplateInstallPreviewPanel
                preview={preview}
                confirmPluginUpdates={confirmPluginUpdates}
                isInstallLoading={isInstallLoading}
                onConfirmPluginUpdatesChange={setConfirmPluginUpdates}
                onApplyTemplate={() => {
                  void handleInstall();
                }}
              />

              <TemplateInstallHistoryPanel
                businessId={businessId}
                actorUserId={actorUserId}
                actorRole={actorRole}
                layers={layers}
                installs={installedTemplates}
                releases={templateReleases}
                onInstallApplied={onInstallApplied}
              />
            </TabsContent>

            <TabsContent value="publish" className="space-y-3">
              <TemplatePublishPanel
                businessId={businessId}
                layers={layers}
                availableCategories={availableCategories}
                isPublishLoading={isPublishLoading}
                publishedRef={publishedRef}
                publishShortcut={TEMPLATE_SHORTCUTS.publishTemplate}
                isActive={open && activeTab === 'publish'}
                onPublish={(draft) => {
                  void handlePublish(draft);
                }}
                onOpenPublishedTemplate={(templateId) => {
                  setActiveTab('marketplace');
                  setSelectedTemplateId(templateId);
                  setResolvedVersion('');
                  setPreview(null);
                }}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </KeyboardShortcutsBoundary>
  );
}
