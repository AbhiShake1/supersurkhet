import type { SchemaKeys } from '..';

const draftScopedPluginTables = new Set<SchemaKeys>([
  'pluginRoutesTabsConfig',
  'pluginSchemaDoc',
  'pluginActionManifestDoc',
]);

export function resolveLifecycleBusinessId({
  table,
  restKeys,
}: {
  table: SchemaKeys;
  restKeys: readonly string[];
}) {
  const candidate = restKeys[0];
  if (!candidate) return undefined;
  if (draftScopedPluginTables.has(table)) return undefined;
  return candidate;
}

export function resolveAfterNextTick<T>(value: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), 0);
  });
}
