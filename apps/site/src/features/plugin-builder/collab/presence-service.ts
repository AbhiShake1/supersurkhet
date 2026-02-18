export interface PresenceCursorMetadata {
  anchorEntityId: string;
  anchorPath?: string;
  anchorOffset?: number;
}

export interface PresenceRecord {
  draftId: string;
  userId: string;
  sessionId: string;
  activeTab: string;
  selectedEntityId?: string;
  cursor?: PresenceCursorMetadata;
  lastSeenAt: string;
  expiresAt: string;
}

export interface JoinPresenceInput {
  draftId: string;
  userId: string;
  sessionId: string;
  activeTab: string;
  selectedEntityId?: string;
  cursor?: PresenceCursorMetadata;
}

export interface UpdatePresenceInput {
  draftId: string;
  sessionId: string;
  activeTab?: string;
  selectedEntityId?: string;
  cursor?: PresenceCursorMetadata;
}

export interface LeavePresenceInput {
  draftId: string;
  sessionId: string;
}

export interface CreateCollaborationPresenceServiceInput {
  ttlMs?: number;
  now?: () => number;
}

export interface CollaborationPresenceService {
  join: (input: JoinPresenceInput) => PresenceRecord;
  update: (input: UpdatePresenceInput) => PresenceRecord;
  leave: (input: LeavePresenceInput) => boolean;
  list: (draftId: string) => PresenceRecord[];
  evictStale: () => number;
}

const DEFAULT_TTL_MS = 30_000;

type DraftPresenceStore = Map<string, PresenceRecord>;

const requireNonEmptyString = (value: string, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
};

const normalizeCursor = (
  cursor: PresenceCursorMetadata | undefined,
): PresenceCursorMetadata | undefined => {
  if (cursor === undefined) {
    return undefined;
  }

  return {
    anchorEntityId: requireNonEmptyString(
      cursor.anchorEntityId,
      'cursor.anchorEntityId',
    ),
    anchorPath:
      cursor.anchorPath === undefined
        ? undefined
        : requireNonEmptyString(cursor.anchorPath, 'cursor.anchorPath'),
    anchorOffset:
      cursor.anchorOffset === undefined
        ? undefined
        : Number(cursor.anchorOffset),
  };
};

const cloneRecord = (record: PresenceRecord): PresenceRecord => ({
  ...record,
  cursor: record.cursor ? { ...record.cursor } : undefined,
});

export const createCollaborationPresenceService = (
  input: CreateCollaborationPresenceServiceInput = {},
): CollaborationPresenceService => {
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error('ttlMs must be a positive number');
  }

  const now = input.now ?? (() => Date.now());
  const byDraft = new Map<string, DraftPresenceStore>();

  const at = () => now();

  const requireDraftId = (draftId: string): string =>
    requireNonEmptyString(draftId, 'draftId');

  const requireSessionId = (sessionId: string): string =>
    requireNonEmptyString(sessionId, 'sessionId');

  const getOrCreateDraftStore = (draftId: string): DraftPresenceStore => {
    const existing = byDraft.get(draftId);
    if (existing) {
      return existing;
    }

    const created = new Map<string, PresenceRecord>();
    byDraft.set(draftId, created);
    return created;
  };

  const stamp = (nowMs: number) => ({
    lastSeenAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
  });

  const evictStaleForDraft = (
    store: DraftPresenceStore,
    nowMs: number,
  ): number => {
    let removed = 0;
    for (const [sessionId, record] of store.entries()) {
      const expiresAtMs = Date.parse(record.expiresAt);
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
        store.delete(sessionId);
        removed += 1;
      }
    }
    return removed;
  };

  return {
    join(inputRecord: JoinPresenceInput): PresenceRecord {
      const nowMs = at();
      const draftId = requireDraftId(inputRecord.draftId);
      const userId = requireNonEmptyString(inputRecord.userId, 'userId');
      const sessionId = requireSessionId(inputRecord.sessionId);
      const activeTab = requireNonEmptyString(
        inputRecord.activeTab,
        'activeTab',
      );

      const store = getOrCreateDraftStore(draftId);
      evictStaleForDraft(store, nowMs);

      const next: PresenceRecord = {
        draftId,
        userId,
        sessionId,
        activeTab,
        selectedEntityId:
          inputRecord.selectedEntityId === undefined
            ? undefined
            : requireNonEmptyString(
                inputRecord.selectedEntityId,
                'selectedEntityId',
              ),
        cursor: normalizeCursor(inputRecord.cursor),
        ...stamp(nowMs),
      };

      store.set(sessionId, next);
      return cloneRecord(next);
    },

    update(updateInput: UpdatePresenceInput): PresenceRecord {
      const nowMs = at();
      const draftId = requireDraftId(updateInput.draftId);
      const sessionId = requireSessionId(updateInput.sessionId);
      const store = byDraft.get(draftId);
      if (!store) {
        throw new Error(`Unknown presence session: ${sessionId}`);
      }

      evictStaleForDraft(store, nowMs);
      const existing = store.get(sessionId);
      if (!existing) {
        throw new Error(`Unknown presence session: ${sessionId}`);
      }

      const updated: PresenceRecord = {
        ...existing,
        activeTab:
          updateInput.activeTab === undefined
            ? existing.activeTab
            : requireNonEmptyString(updateInput.activeTab, 'activeTab'),
        selectedEntityId:
          updateInput.selectedEntityId === undefined
            ? existing.selectedEntityId
            : requireNonEmptyString(
                updateInput.selectedEntityId,
                'selectedEntityId',
              ),
        cursor:
          updateInput.cursor === undefined
            ? existing.cursor
            : normalizeCursor(updateInput.cursor),
        ...stamp(nowMs),
      };

      store.set(sessionId, updated);
      return cloneRecord(updated);
    },

    leave(leaveInput: LeavePresenceInput): boolean {
      const draftId = requireDraftId(leaveInput.draftId);
      const sessionId = requireSessionId(leaveInput.sessionId);
      const store = byDraft.get(draftId);
      if (!store) {
        return false;
      }

      const removed = store.delete(sessionId);
      if (store.size === 0) {
        byDraft.delete(draftId);
      }
      return removed;
    },

    list(draftIdInput: string): PresenceRecord[] {
      const draftId = requireDraftId(draftIdInput);
      const store = byDraft.get(draftId);
      if (!store) {
        return [];
      }

      evictStaleForDraft(store, at());
      if (store.size === 0) {
        byDraft.delete(draftId);
        return [];
      }

      return [...store.values()].map((record) => cloneRecord(record));
    },

    evictStale(): number {
      const nowMs = at();
      let removed = 0;

      for (const [draftId, store] of byDraft.entries()) {
        removed += evictStaleForDraft(store, nowMs);
        if (store.size === 0) {
          byDraft.delete(draftId);
        }
      }

      return removed;
    },
  };
};
