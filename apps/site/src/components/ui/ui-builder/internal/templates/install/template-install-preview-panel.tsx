'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { UiTemplateInstallPreview } from '@/lib/plugins/types';
import { TemplateConflictReport } from './template-conflict-report';
import { TemplatePluginDiffList } from './template-plugin-diff-list';

type TemplateInstallPreviewPanelProps = {
  preview: UiTemplateInstallPreview | null;
  confirmPluginUpdates: boolean;
  isInstallLoading?: boolean;
  onConfirmPluginUpdatesChange: (confirmed: boolean) => void;
  onApplyTemplate: () => void;
};

function getApplyDisabledReason({
  preview,
  confirmPluginUpdates,
  isInstallLoading,
}: {
  preview: UiTemplateInstallPreview;
  confirmPluginUpdates: boolean;
  isInstallLoading: boolean;
}) {
  if (isInstallLoading) return 'Applying template...';
  if (preview.hardConflicts.length > 0) {
    return 'Apply is blocked until hard conflicts are resolved.';
  }
  if (preview.requiresPluginUpdateConfirmation && !confirmPluginUpdates) {
    return 'Apply is blocked until plugin updates are explicitly confirmed.';
  }
  return null;
}

export function TemplateInstallPreviewPanel({
  preview,
  confirmPluginUpdates,
  isInstallLoading = false,
  onConfirmPluginUpdatesChange,
  onApplyTemplate,
}: TemplateInstallPreviewPanelProps) {
  if (!preview) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        Run install preview to see merge stats, plugin changes, and conflicts.
      </div>
    );
  }

  const applyDisabledReason = getApplyDisabledReason({
    preview,
    confirmPluginUpdates,
    isInstallLoading,
  });

  return (
    <section className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-semibold">
        Install Preview: {preview.templateId}@{preview.version}
      </p>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Pages added</p>
          <p className="font-semibold">{preview.mergeSummary.pagesAdded}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Pages merged</p>
          <p className="font-semibold">{preview.mergeSummary.pagesMerged}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Hard conflicts</p>
          <p className="font-semibold">{preview.mergeSummary.hardConflicts}</p>
        </div>
      </div>

      <TemplatePluginDiffList pluginPlan={preview.pluginPlan} />
      <TemplateConflictReport conflicts={preview.hardConflicts} />

      {preview.requiresPluginUpdateConfirmation ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={confirmPluginUpdates}
              onCheckedChange={(checked) =>
                onConfirmPluginUpdatesChange(Boolean(checked))
              }
            />
            <span>
              Confirm plugin version updates before applying template.
            </span>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Button
          onClick={onApplyTemplate}
          disabled={Boolean(applyDisabledReason)}
          className="w-full"
        >
          {isInstallLoading ? 'Applying template...' : 'Apply Template'}
        </Button>
        <output className="text-xs text-muted-foreground">
          {applyDisabledReason ?? 'Ready to apply: no hard conflicts detected.'}
        </output>
      </div>
    </section>
  );
}
