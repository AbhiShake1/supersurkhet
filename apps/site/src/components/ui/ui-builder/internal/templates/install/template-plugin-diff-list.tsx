'use client';

import { Badge } from '@/components/ui/badge';
import type { UiTemplateInstallPreview } from '@/lib/plugins/types';

type TemplatePluginDiffListProps = {
  pluginPlan: UiTemplateInstallPreview['pluginPlan'];
};

function HydrationBadge({ releaseMissingInTarget }: { releaseMissingInTarget: boolean }) {
  if (!releaseMissingInTarget) return null;
  return <Badge variant="outline">Hydrates release</Badge>;
}

export function TemplatePluginDiffList({
  pluginPlan,
}: TemplatePluginDiffListProps) {
  const totalChanges =
    pluginPlan.install.length + pluginPlan.update.length + pluginPlan.noOp.length;

  if (totalChanges === 0) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        No plugin bundles in this template release.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Install</p>
          <p className="font-semibold">{pluginPlan.install.length}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Update</p>
          <p className="font-semibold">{pluginPlan.update.length}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">No-op</p>
          <p className="font-semibold">{pluginPlan.noOp.length}</p>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <p className="font-medium">Install</p>
        {pluginPlan.install.length === 0 ? (
          <p className="text-muted-foreground">No new plugins to install.</p>
        ) : (
          pluginPlan.install.map((item) => (
            <div
              key={`install:${item.pluginId}`}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
            >
              <span>
                + {item.pluginId}@{item.version}
              </span>
              <HydrationBadge
                releaseMissingInTarget={item.releaseMissingInTarget}
              />
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 text-xs">
        <p className="font-medium">Update</p>
        {pluginPlan.update.length === 0 ? (
          <p className="text-muted-foreground">No plugin updates required.</p>
        ) : (
          pluginPlan.update.map((item) => (
            <div
              key={`update:${item.pluginId}`}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
            >
              <span>
                ~ {item.pluginId} {item.fromVersion} {'->'} {item.toVersion}
              </span>
              <div className="flex items-center gap-2">
                {item.requiresConfirmation ? (
                  <Badge variant="secondary">Confirmation required</Badge>
                ) : null}
                <HydrationBadge
                  releaseMissingInTarget={item.releaseMissingInTarget}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 text-xs">
        <p className="font-medium">No-op</p>
        {pluginPlan.noOp.length === 0 ? (
          <p className="text-muted-foreground">No unchanged plugin bundles.</p>
        ) : (
          pluginPlan.noOp.map((item) => (
            <div
              key={`noop:${item.pluginId}`}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
            >
              <span>
                = {item.pluginId}@{item.version}
              </span>
              <HydrationBadge
                releaseMissingInTarget={item.releaseMissingInTarget}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
