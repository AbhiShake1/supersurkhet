'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { UiTemplateInstallPreview } from '@/lib/plugins/types';

type TemplateConflictReportProps = {
  conflicts: UiTemplateInstallPreview['hardConflicts'];
};

function toDiagnosticsText(
  conflicts: UiTemplateInstallPreview['hardConflicts'],
) {
  return conflicts
    .map((conflict) => {
      const metadata = [
        `code=${conflict.code}`,
        `path=${conflict.path}`,
        `page=${conflict.pageKey}`,
        conflict.layerId ? `layerId=${conflict.layerId}` : null,
        conflict.source ? `source=${conflict.source}` : null,
        conflict.targetType ? `targetType=${conflict.targetType}` : null,
        conflict.templateType ? `templateType=${conflict.templateType}` : null,
      ]
        .filter(Boolean)
        .join(' ');
      return `${metadata} :: ${conflict.message}`;
    })
    .join('\n');
}

export function TemplateConflictReport({
  conflicts,
}: TemplateConflictReportProps) {
  const diagnosticsText = useMemo(
    () => toDiagnosticsText(conflicts),
    [conflicts],
  );
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 1200 });

  if (conflicts.length === 0) {
    return (
      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
        <p className="font-semibold text-emerald-700">
          No hard conflicts detected.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-destructive">
          Hard conflicts ({conflicts.length})
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(diagnosticsText)}
        >
          {isCopied ? 'Copied' : 'Copy diagnostics'}
        </Button>
      </div>

      <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
        {conflicts.map((conflict, index) => (
          <li
            key={`${conflict.code}:${conflict.path}:${index}`}
            className="rounded-md border border-destructive/30 bg-background/80 p-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">{conflict.code}</Badge>
              <span className="font-mono">{conflict.path}</span>
              {conflict.layerId ? (
                <Badge variant="outline">layer {conflict.layerId}</Badge>
              ) : null}
            </div>
            <p className="mt-1">{conflict.message}</p>
            <p className="mt-1 text-muted-foreground">
              page={conflict.pageKey}
              {conflict.source ? ` source=${conflict.source}` : ''}
              {conflict.targetType ? ` target=${conflict.targetType}` : ''}
              {conflict.templateType
                ? ` template=${conflict.templateType}`
                : ''}
            </p>
          </li>
        ))}
      </ul>

      <textarea
        className="min-h-24 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
        readOnly
        value={diagnosticsText}
        aria-label="Conflict diagnostics"
      />
    </section>
  );
}
