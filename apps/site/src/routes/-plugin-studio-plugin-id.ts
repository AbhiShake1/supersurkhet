function normalizePluginId(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolvePluginStudioPluginId({
  searchPluginId,
  persistedPluginId,
  fallbackPluginId,
}: {
  searchPluginId?: string;
  persistedPluginId?: string;
  fallbackPluginId: string;
}) {
  return (
    normalizePluginId(searchPluginId) ??
    normalizePluginId(persistedPluginId) ??
    normalizePluginId(fallbackPluginId) ??
    'example.plugin'
  );
}

export function shouldSyncPluginStudioSearch({
  pluginId,
  searchPluginId,
  searchDraftId,
}: {
  pluginId: string;
  searchPluginId?: string;
  searchDraftId?: string;
}) {
  const normalizedPluginId = normalizePluginId(pluginId);
  if (!normalizedPluginId) return false;

  const normalizedSearchPluginId = normalizePluginId(searchPluginId);
  const normalizedSearchDraftId = normalizePluginId(searchDraftId);

  if (normalizedSearchPluginId !== normalizedPluginId) {
    return true;
  }

  return Boolean(normalizedSearchDraftId);
}
