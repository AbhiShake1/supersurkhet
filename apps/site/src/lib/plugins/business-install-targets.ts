import { parseReleaseId } from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';

function collectRequestedCapabilities(release?: PluginReleaseDoc): string[] {
  if (!release?.actionManifest) {
    return [];
  }
  return [
    ...new Set(
      release.actionManifest.flatMap((action) => action.capabilities ?? []),
    ),
  ];
}

export function toInstallTargets(
  selectedReleaseIds: string[],
  releasesById: ReadonlyMap<string, PluginReleaseDoc>,
) {
  const targets = new Map<
    string,
    { pluginId: string; version: string; requestedCapabilities: string[] }
  >();
  for (const releaseId of selectedReleaseIds) {
    const parsed = parseReleaseId(releaseId);
    if (!parsed) continue;
    targets.set(parsed.pluginId, {
      ...parsed,
      requestedCapabilities: collectRequestedCapabilities(
        releasesById.get(releaseId),
      ),
    });
  }
  return [...targets.values()];
}
