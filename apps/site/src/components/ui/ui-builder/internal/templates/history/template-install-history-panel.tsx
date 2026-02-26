'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  BusinessUiTemplateInstallDoc,
  ComponentLayer,
  UiTemplateInstallPreview,
  UiTemplateReleaseDoc,
} from '@/lib/plugins/types';
import {
  clearTemplatePreviewCache,
  getTemplatePreviewFromCache,
  hashTemplatePreviewLayers,
  setTemplatePreviewInCache,
  type TemplatePreviewCacheKeyInput,
} from '@/lib/ui-builder/template-preview-cache';
import {
  installUiTemplateRelease,
  previewUiTemplateInstall,
} from '@/server-functions/plugins';

type ActorRole = 'owner' | 'admin' | 'staff';

type TemplateInstallHistoryPanelProps = {
  businessId: string;
  actorUserId: string;
  actorRole: ActorRole;
  layers: ComponentLayer[];
  installs: BusinessUiTemplateInstallDoc[];
  releases: UiTemplateReleaseDoc[];
  onInstallApplied?: (layers: ComponentLayer[]) => void;
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

function formatInstallTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
}

export function TemplateInstallHistoryPanel({
  businessId,
  actorUserId,
  actorRole,
  layers,
  installs,
  releases,
  onInstallApplied,
}: TemplateInstallHistoryPanelProps) {
  const [activeCompareKey, setActiveCompareKey] = useState<string | null>(null);
  const [previewByInstallKey, setPreviewByInstallKey] = useState<
    Record<string, UiTemplateInstallPreview>
  >({});
  const [loadingByInstallKey, setLoadingByInstallKey] = useState<
    Record<string, boolean>
  >({});
  const [applyLoadingByInstallKey, setApplyLoadingByInstallKey] = useState<
    Record<string, boolean>
  >({});

  const releaseByKey = useMemo(() => {
    const map = new Map<string, UiTemplateReleaseDoc>();
    for (const release of releases) {
      map.set(`${release.templateId}@${release.version}`, release);
    }
    return map;
  }, [releases]);

  const historyRows = useMemo(
    () =>
      installs
        .filter((row) => row.businessId === businessId)
        .sort((left, right) =>
          right.installedAt.localeCompare(left.installedAt),
        ),
    [businessId, installs],
  );

  const layersHash = useMemo(() => hashTemplatePreviewLayers(layers), [layers]);

  function cacheInputForInstall(row: BusinessUiTemplateInstallDoc) {
    return {
      businessId,
      templateId: row.templateId,
      version: row.version,
      layersHash,
    } satisfies TemplatePreviewCacheKeyInput;
  }

  async function resolvePreview(
    row: BusinessUiTemplateInstallDoc,
    input: TemplatePreviewCacheKeyInput,
  ) {
    const cachedPreview = getTemplatePreviewFromCache(input);
    if (cachedPreview) {
      setPreviewByInstallKey((current) => ({
        ...current,
        [row.id]: cachedPreview,
      }));
    }

    const preview = await previewUiTemplateInstall({
      data: {
        businessId,
        templateId: row.templateId,
        version: row.version,
      },
    });
    setTemplatePreviewInCache(input, preview);
    setPreviewByInstallKey((current) => ({
      ...current,
      [row.id]: preview,
    }));
    return preview;
  }

  async function handleCompare(row: BusinessUiTemplateInstallDoc) {
    const input = cacheInputForInstall(row);
    setActiveCompareKey(row.id);
    setLoadingByInstallKey((current) => ({ ...current, [row.id]: true }));
    try {
      await resolvePreview(row, input);
    } catch (error) {
      toast.error(normalizeErrorMessage(error));
    } finally {
      setLoadingByInstallKey((current) => ({ ...current, [row.id]: false }));
    }
  }

  async function handleReapply(row: BusinessUiTemplateInstallDoc) {
    const input = cacheInputForInstall(row);
    setApplyLoadingByInstallKey((current) => ({ ...current, [row.id]: true }));
    try {
      const cachedPreview = getTemplatePreviewFromCache(input);
      if (cachedPreview) {
        setPreviewByInstallKey((current) => ({
          ...current,
          [row.id]: cachedPreview,
        }));
      }

      const preview = cachedPreview ?? (await resolvePreview(row, input));

      if (preview.hardConflicts.length > 0) {
        toast.error('Hard conflicts found. Resolve conflicts before re-apply.');
        return;
      }

      const installed = await installUiTemplateRelease({
        data: {
          actorUserId,
          actorRole,
          businessId,
          templateId: row.templateId,
          version: row.version,
          confirmPluginUpdates: true,
        },
      });
      if (Array.isArray(installed.layers)) {
        onInstallApplied?.(installed.layers as ComponentLayer[]);
      }
      toast.success(`Re-applied ${row.templateId}@${row.version}`);
    } catch (error) {
      toast.error(normalizeErrorMessage(error));
    } finally {
      setApplyLoadingByInstallKey((current) => ({
        ...current,
        [row.id]: false,
      }));
    }
  }

  return (
    <section className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Install History</h3>
          <p className="text-xs text-muted-foreground">
            Per-business install timeline with replay and compare checks.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearTemplatePreviewCache}
        >
          Reset preview cache
        </Button>
      </div>

      <div className="space-y-2">
        {historyRows.map((row) => {
          const release = releaseByKey.get(`${row.templateId}@${row.version}`);
          const preview = previewByInstallKey[row.id];
          return (
            <article key={row.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {release?.docs.title ?? row.templateId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.templateId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Installed {formatInstallTime(row.installedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">v{row.version}</Badge>
                  <Badge variant="secondary">{row.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded border p-2">
                  pages +{row.summary.pagesAdded} / ~{row.summary.pagesMerged}
                </div>
                <div className="rounded border p-2">
                  plugins +{row.summary.pluginsInstalled} / ~
                  {row.summary.pluginsUpdated}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCompare(row)}
                  disabled={Boolean(loadingByInstallKey[row.id])}
                >
                  {loadingByInstallKey[row.id] ? 'Comparing...' : 'Compare'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleReapply(row)}
                  disabled={Boolean(applyLoadingByInstallKey[row.id])}
                >
                  {applyLoadingByInstallKey[row.id]
                    ? 'Re-applying...'
                    : 'Re-apply'}
                </Button>
              </div>

              {activeCompareKey === row.id && preview ? (
                <div className="rounded-md border bg-muted/20 p-2 text-xs space-y-1">
                  <p>
                    Preview now: +{preview.mergeSummary.pagesAdded} / ~
                    {preview.mergeSummary.pagesMerged} / conflicts{' '}
                    {preview.mergeSummary.hardConflicts}
                  </p>
                  <p>
                    Plugin plan: install {preview.pluginPlan.install.length},
                    update {preview.pluginPlan.update.length}, no-op{' '}
                    {preview.pluginPlan.noOp.length}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {historyRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No installs yet for this business.
        </p>
      ) : null}
    </section>
  );
}
