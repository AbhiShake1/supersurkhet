import { Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useBusinessConfig } from '@/config/business-config';
import type { PluginCatalogEntry } from '@/lib/plugins/admin-plugin-catalog';
import {
  isPluginSystemSentinelSchema,
  resolveReleaseSubdomainSurface,
} from '@/lib/plugins/subdomain-surface';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';

type PluginPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PluginCatalogEntry;
  businessSlug: string;
  businessId?: string;
  isInstalled: boolean;
  initialSubdomain?: string;
  onInstall: () => Promise<boolean | undefined>;
};

const baseComponentRegistry = {
  ...primitiveComponentDefinitions,
  ...complexComponentDefinitions,
};

function normalizeSubdomainName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'index';
}

function toPreviewPage(
  subdomain: string,
  layers: unknown[] | null,
): ComponentLayer | null {
  if (Array.isArray(layers) && layers.length > 0) {
    return layers[0] as ComponentLayer;
  }

  return {
    id: `${subdomain}-preview-empty`,
    name: `${subdomain} preview`,
    type: 'div',
    props: {
      className:
        'flex min-h-[70vh] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground',
    },
    children: 'No UI layers available for this subdomain yet.',
  } satisfies ComponentLayer;
}

function toReleaseAdminTabs(
  entry: PluginCatalogEntry,
  businessSlug: string,
): AutoAdminTabInput[] {
  return (entry.latestRelease.adminTabs ?? [])
    .filter(
      (tab) =>
        typeof tab.schema === 'string' &&
        tab.schema.trim().length > 0 &&
        !isPluginSystemSentinelSchema(tab.schema),
    )
    .map((tab) => ({
      schema: tab.schema,
      title: tab.title ?? tab.schema,
      group: tab.group,
      slug: businessSlug,
    })) as unknown as AutoAdminTabInput[];
}

export function PluginPreviewDialog({
  open,
  onOpenChange,
  entry,
  businessSlug,
  businessId,
  isInstalled,
  initialSubdomain,
  onInstall,
}: PluginPreviewDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [selectedSubdomain, setSelectedSubdomain] = useState('admin');
  const currentConfig = useBusinessConfig({
    slug: businessSlug,
    businessId,
  });

  const currentBusinessTabs = useMemo(
    () => currentConfig as AutoAdminTabInput[],
    [currentConfig],
  );

  const simulatedTabs = useMemo(() => {
    const releaseTabs = toReleaseAdminTabs(entry, businessSlug);
    const merged = [...currentBusinessTabs, ...releaseTabs];
    const deduped = new Map<string, AutoAdminTabInput>();

    for (const tab of merged) {
      const tabRecord = tab as Record<string, unknown>;
      const key = JSON.stringify({
        schema: tabRecord.schema ?? '',
        title: tabRecord.title ?? '',
        group: tabRecord.group ?? '',
      });
      deduped.set(key, tab);
    }

    return [...deduped.values()];
  }, [entry, currentBusinessTabs, businessSlug]);

  const subdomainSurface = useMemo(
    () =>
      resolveReleaseSubdomainSurface(entry.latestRelease, {
        ensureDefaultSubdomains: true,
        includeAdminFallbackLayers: true,
      }),
    [entry.latestRelease],
  );

  const availableSubdomains = subdomainSurface.subdomains;

  useEffect(() => {
    if (!open) return;
    const normalizedRequested = initialSubdomain
      ? normalizeSubdomainName(initialSubdomain)
      : '';
    if (
      normalizedRequested &&
      availableSubdomains.includes(normalizedRequested)
    ) {
      setSelectedSubdomain(normalizedRequested);
      return;
    }
    setSelectedSubdomain(availableSubdomains[0] ?? 'admin');
  }, [open, initialSubdomain, availableSubdomains]);

  const selectedLayers =
    subdomainSurface.uiLayersBySubdomain[selectedSubdomain] ?? null;
  const selectedPage = toPreviewPage(selectedSubdomain, selectedLayers);

  const previewComponentRegistry = useMemo(() => {
    const autoAdminEntry = baseComponentRegistry.AutoAdmin;
    return {
      ...baseComponentRegistry,
      AutoAdmin: {
        ...autoAdminEntry,
        component: () => <AutoAdmin tabs={simulatedTabs} />,
        schema: z.object({}),
      },
    };
  }, [simulatedTabs]);

  const selectedPreviewImages =
    subdomainSurface.imageUrlsBySubdomain[selectedSubdomain] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!m-0 !h-screen !w-screen !max-h-none !max-w-none !translate-x-0 !translate-y-0 !rounded-none !left-0 !top-0 flex flex-col gap-0 p-0">
        <DialogHeader className="border-b bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <DialogTitle className="text-base font-semibold text-foreground">
                {entry.title}
              </DialogTitle>
              <Badge variant="secondary">{selectedSubdomain}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/90">
              <span className="inline-flex size-2 animate-pulse rounded-full bg-primary" />
              <span>Subdomain-aware live preview</span>
            </div>
            <Button
              size="sm"
              className="mr-8 shadow-lg shadow-primary/30 ring-1 ring-primary/40"
              disabled={isInstalled || isInstalling}
              onClick={async () => {
                if (isInstalled || isInstalling) return;
                setIsInstalling(true);
                try {
                  const installSucceeded = await onInstall();
                  if (installSucceeded !== false) {
                    onOpenChange(false);
                  }
                } finally {
                  setIsInstalling(false);
                }
              }}
            >
              {isInstalled
                ? 'Installed'
                : isInstalling
                  ? 'Installing...'
                  : 'Install Plugin'}
            </Button>
          </div>
        </DialogHeader>

        <div className="border-b px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {availableSubdomains.map((subdomain) => (
              <Button
                key={subdomain}
                size="sm"
                variant={
                  selectedSubdomain === subdomain ? 'default' : 'outline'
                }
                onClick={() => setSelectedSubdomain(subdomain)}
              >
                {subdomain}
              </Button>
            ))}
          </div>
        </div>

        {selectedPreviewImages.length > 0 ? (
          <div className="border-b px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedPreviewImages.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt={`${selectedSubdomain} preview`}
                  className="h-16 w-28 rounded-md border border-border object-cover"
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto p-0">
          {selectedPage ? (
            <ContextDataStore
              contextData={{
                business: { basePath: businessSlug },
                search: {},
                date: {
                  currentTime: new Date().toISOString(),
                  locale: 'en-US',
                  timezone: 'UTC',
                },
              }}
            >
              <LayerRenderer
                componentRegistry={previewComponentRegistry}
                page={selectedPage}
              />
            </ContextDataStore>
          ) : (
            <div className="m-0 flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <div className="mb-4">
                <Eye className="mx-auto h-12 w-12 opacity-50" />
              </div>
              <h3 className="mb-2 text-lg font-medium">No UI preview</h3>
              <p className="text-sm">
                This release does not define previewable UI layers yet.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
