function normalizePluginId(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolveNewPluginId({
  basePluginId,
  existingPluginIds,
}: {
  basePluginId: string;
  existingPluginIds: readonly string[];
}) {
  const normalizedBasePluginId = normalizePluginId(basePluginId);
  if (!normalizedBasePluginId) {
    return 'plugin.example';
  }

  const existingPluginIdSet = new Set(
    existingPluginIds
      .map((value) => normalizePluginId(value))
      .filter((value): value is string => Boolean(value)),
  );

  if (!existingPluginIdSet.has(normalizedBasePluginId)) {
    return normalizedBasePluginId;
  }

  let suffix = 1;
  while (existingPluginIdSet.has(`${normalizedBasePluginId}.${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBasePluginId}.${suffix}`;
}
