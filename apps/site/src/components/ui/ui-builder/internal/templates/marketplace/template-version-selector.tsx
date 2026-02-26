import { useEffect, useId, useMemo } from 'react';
import type { UiTemplateReleaseDoc } from '@/lib/plugins/types';

export type TemplateVersionSelection = {
  preferLatestVersion: boolean;
  selectedVersion: string;
  resolvedVersion: string;
};

type TemplateVersionSelectorProps = {
  releases: UiTemplateReleaseDoc[];
  preferLatestVersion: boolean;
  selectedVersion: string;
  onPreferLatestVersionChange: (checked: boolean) => void;
  onSelectedVersionChange: (version: string) => void;
  onResolvedSelectionChange?: (selection: TemplateVersionSelection) => void;
};

function compareTemplateVersions(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function TemplateVersionSelector({
  releases,
  preferLatestVersion,
  selectedVersion,
  onPreferLatestVersionChange,
  onSelectedVersionChange,
  onResolvedSelectionChange,
}: TemplateVersionSelectorProps) {
  const selectId = useId();
  const sortedReleases = useMemo(
    () =>
      [...releases].sort((left, right) =>
        compareTemplateVersions(right.version, left.version),
      ),
    [releases],
  );

  const resolvedVersion = preferLatestVersion
    ? (sortedReleases[0]?.version ?? '')
    : selectedVersion || sortedReleases[0]?.version || '';

  useEffect(() => {
    onResolvedSelectionChange?.({
      preferLatestVersion,
      selectedVersion,
      resolvedVersion,
    });
  }, [
    onResolvedSelectionChange,
    preferLatestVersion,
    resolvedVersion,
    selectedVersion,
  ]);

  if (sortedReleases.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="template-version-selector">
      <div className="flex items-center justify-between">
        <label htmlFor={selectId} className="text-sm font-medium">
          Version
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={preferLatestVersion}
            onChange={(event) =>
              onPreferLatestVersionChange(Boolean(event.target.checked))
            }
            data-testid="template-version-latest-toggle"
          />
          Use latest
        </label>
      </div>

      <select
        id={selectId}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={resolvedVersion}
        disabled={preferLatestVersion}
        onChange={(event) => onSelectedVersionChange(event.target.value)}
        data-testid="template-version-select"
      >
        {sortedReleases.map((release) => (
          <option key={release.id} value={release.version}>
            {release.version}
          </option>
        ))}
      </select>
    </div>
  );
}
