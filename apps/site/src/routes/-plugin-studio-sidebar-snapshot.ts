export const PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION = 1 as const;

const STORAGE_KEY_PREFIX = 'plugin_studio_sidebar_snapshot';

export type PluginStudioSystemTabKey = 'dashboard' | 'qr' | 'website';

export type PluginStudioSystemTab = {
  title: string;
  group?: string;
  iconName?: string;
};

export type PluginStudioSystemTabState = Record<
  PluginStudioSystemTabKey,
  PluginStudioSystemTab
>;

export type PluginStudioSidebarSnapshot = {
  version: typeof PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION;
  pluginId: string;
  draftId?: string;
  updatedAt: string;
  schemaOrder: string[];
  schemaTitleById: Record<string, string>;
  schemaGroupById: Record<string, string>;
  schemaIconNameById: Record<string, string>;
  customGroups: string[];
  groupOrder: string[];
  systemTabs: PluginStudioSystemTabState;
};

export function buildPluginStudioSidebarSnapshotStorageKey({
  actorUserId,
  pluginId,
  draftId,
}: {
  actorUserId: string;
  pluginId: string;
  draftId?: string;
}) {
  return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(actorUserId)}:${encodeURIComponent(pluginId)}:${encodeURIComponent(draftId ?? 'none')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const next: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    const normalized = entry.trim();
    if (normalized) next.push(normalized);
  }
  return next;
}

function parseStringRecord(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const next: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') return null;
    const normalizedKey = key.trim();
    const normalizedValue = entry.trim();
    if (!normalizedKey || !normalizedValue) continue;
    next[normalizedKey] = normalizedValue;
  }
  return next;
}

function parseSystemTabs({
  value,
  defaultSystemTabs,
}: {
  value: unknown;
  defaultSystemTabs: PluginStudioSystemTabState;
}): PluginStudioSystemTabState | null {
  if (!isRecord(value)) return null;

  const next: PluginStudioSystemTabState = {
    dashboard: {
      title: defaultSystemTabs.dashboard.title,
      group: defaultSystemTabs.dashboard.group,
      iconName: defaultSystemTabs.dashboard.iconName,
    },
    qr: {
      title: defaultSystemTabs.qr.title,
      group: defaultSystemTabs.qr.group,
      iconName: defaultSystemTabs.qr.iconName,
    },
    website: {
      title: defaultSystemTabs.website.title,
      group: defaultSystemTabs.website.group,
      iconName: defaultSystemTabs.website.iconName,
    },
  };

  for (const key of ['dashboard', 'qr', 'website'] as const) {
    const rawTab = value[key];
    if (!isRecord(rawTab)) continue;

    const title =
      typeof rawTab.title === 'string' ? rawTab.title.trim() : undefined;
    if (!title) continue;

    const group =
      typeof rawTab.group === 'string' && rawTab.group.trim()
        ? rawTab.group.trim()
        : undefined;
    const iconName =
      typeof rawTab.iconName === 'string' && rawTab.iconName.trim()
        ? rawTab.iconName.trim()
        : undefined;

    next[key] = {
      title,
      group,
      iconName,
    };
  }

  return next;
}

export function parsePluginStudioSidebarSnapshot({
  raw,
  defaultSystemTabs,
}: {
  raw: string | null;
  defaultSystemTabs: PluginStudioSystemTabState;
}): PluginStudioSidebarSnapshot | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION) return null;

  const pluginId =
    typeof parsed.pluginId === 'string' ? parsed.pluginId.trim() : '';
  if (!pluginId) return null;

  const draftId =
    typeof parsed.draftId === 'string' && parsed.draftId.trim()
      ? parsed.draftId.trim()
      : undefined;

  const updatedAt =
    typeof parsed.updatedAt === 'string' ? parsed.updatedAt.trim() : '';
  if (!updatedAt) return null;

  const schemaOrder = parseStringArray(parsed.schemaOrder);
  if (!schemaOrder) return null;

  const schemaTitleById = parseStringRecord(parsed.schemaTitleById);
  if (!schemaTitleById) return null;

  const schemaGroupById = parseStringRecord(parsed.schemaGroupById);
  if (!schemaGroupById) return null;

  const schemaIconNameById = parseStringRecord(parsed.schemaIconNameById);
  if (!schemaIconNameById) return null;

  const customGroups = parseStringArray(parsed.customGroups);
  if (!customGroups) return null;

  const groupOrder = parseStringArray(parsed.groupOrder);
  if (!groupOrder) return null;

  const systemTabs = parseSystemTabs({
    value: parsed.systemTabs,
    defaultSystemTabs,
  });
  if (!systemTabs) return null;

  return {
    version: PLUGIN_STUDIO_SIDEBAR_SNAPSHOT_VERSION,
    pluginId,
    draftId,
    updatedAt,
    schemaOrder,
    schemaTitleById,
    schemaGroupById,
    schemaIconNameById,
    customGroups,
    groupOrder,
    systemTabs,
  };
}

export function pickLatestPluginStudioSidebarSnapshot({
  raws,
  defaultSystemTabs,
}: {
  raws: Array<string | null | undefined>;
  defaultSystemTabs: PluginStudioSystemTabState;
}): PluginStudioSidebarSnapshot | null {
  let latest: PluginStudioSidebarSnapshot | null = null;

  for (const raw of raws) {
    const snapshot = parsePluginStudioSidebarSnapshot({
      raw: raw ?? null,
      defaultSystemTabs,
    });
    if (!snapshot) continue;
    if (!latest || snapshot.updatedAt.localeCompare(latest.updatedAt) > 0) {
      latest = snapshot;
    }
  }

  return latest;
}

export function shouldApplyPluginStudioSidebarSnapshot({
  snapshot,
  draftId,
  latestRevisionCreatedAt,
}: {
  snapshot: PluginStudioSidebarSnapshot;
  draftId?: string;
  latestRevisionCreatedAt?: string;
}) {
  if (snapshot.draftId && draftId && snapshot.draftId !== draftId) {
    return false;
  }
  if (snapshot.draftId && !draftId) {
    return false;
  }

  const latest = latestRevisionCreatedAt?.trim();
  if (!latest) {
    return true;
  }

  return snapshot.updatedAt.localeCompare(latest) > 0;
}
