import { getGunRef, mergeKeys } from '@/lib/gun/utils';

export interface SidebarPreferences {
  frequentUsage: Record<string, number>;
  groupOpenState: Record<string, boolean>;
}

const EMPTY_SIDEBAR_PREFERENCES: SidebarPreferences = {
  frequentUsage: {},
  groupOpenState: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeFrequentUsage(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const next: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) continue;
    next[key] = raw;
  }
  return next;
}

function normalizeGroupOpenState(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const next: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'boolean') continue;
    next[key] = raw;
  }
  return next;
}

function normalizeSidebarPreferences(value: unknown): SidebarPreferences {
  if (!isRecord(value)) return EMPTY_SIDEBAR_PREFERENCES;
  return {
    frequentUsage: normalizeFrequentUsage(value.frequentUsage),
    groupOpenState: normalizeGroupOpenState(value.groupOpenState),
  };
}

export async function loadSidebarPreferences(
  userId: string | null | undefined,
): Promise<SidebarPreferences> {
  if (!userId) return EMPTY_SIDEBAR_PREFERENCES;
  return new Promise((resolve) => {
    getGunRef(mergeKeys('user'))
      .get(userId)
      .get('preferences')
      .get('collapsibleSidebar')
      .once((data: unknown) => {
        resolve(normalizeSidebarPreferences(data));
      });
  });
}

export function saveSidebarPreferences(
  userId: string | null | undefined,
  patch: Partial<SidebarPreferences>,
): void {
  if (!userId) return;
  const normalizedPatch: Partial<SidebarPreferences> = {};
  if (patch.frequentUsage !== undefined) {
    normalizedPatch.frequentUsage = normalizeFrequentUsage(patch.frequentUsage);
  }
  if (patch.groupOpenState !== undefined) {
    normalizedPatch.groupOpenState = normalizeGroupOpenState(
      patch.groupOpenState,
    );
  }
  if (Object.keys(normalizedPatch).length === 0) return;
  getGunRef(mergeKeys('user'))
    .get(userId)
    .get('preferences')
    .get('collapsibleSidebar')
    .put(normalizedPatch);
}
