import type { SchemaKeys } from '@gta/react-hooks';
import type { PluginReleaseDoc } from '@/lib/plugins/types';

const PREPOPULATE_DATA_TABLE_PRIORITY: readonly SchemaKeys[] = [
  'product',
  'menuItem',
];

const PREPOPULATE_DATA_TABLE_SET = new Set<SchemaKeys>(
  PREPOPULATE_DATA_TABLE_PRIORITY,
);

export function getBusinessDataFieldFromSelectedReleases({
  selectedReleaseIds,
  releases,
}: {
  selectedReleaseIds: string[];
  releases: PluginReleaseDoc[];
}): SchemaKeys | null {
  const releaseById = new Map(releases.map((release) => [release.id, release]));

  for (const releaseId of selectedReleaseIds) {
    const release = releaseById.get(releaseId);
    if (!release) continue;

    for (const tab of release.adminTabs ?? []) {
      const schema = tab.schema as SchemaKeys;
      if (PREPOPULATE_DATA_TABLE_SET.has(schema)) {
        return schema;
      }
    }
  }

  return null;
}
