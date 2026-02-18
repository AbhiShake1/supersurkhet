import {
  type PluginBuildDiagnostic,
  sortPluginBuildDiagnostics,
} from '@/features/plugin-builder/domain/validation/diagnostics-contract';

export type PluginsV2DiagnosticsAuditMetadata = {
  compilerVersion: string;
  actorUserId: string;
  timestamp: string;
};

export type PluginsV2RevisionDiagnosticsSnapshot = {
  revisionId: string;
  diagnostics: PluginBuildDiagnostic[];
  audit: PluginsV2DiagnosticsAuditMetadata;
};

export type PluginsV2RevisionDiagnosticsSnapshotInput = {
  revisionId: string;
  diagnostics: readonly PluginBuildDiagnostic[];
  audit: PluginsV2DiagnosticsAuditMetadata;
};

export type PluginsV2DiagnosticsStore = {
  appendRevisionDiagnostics: (
    input: PluginsV2RevisionDiagnosticsSnapshotInput,
  ) => PluginsV2RevisionDiagnosticsSnapshot;
  listRevisionDiagnostics: (
    revisionId: string,
  ) => PluginsV2RevisionDiagnosticsSnapshot[];
  getLatestRevisionDiagnostics: (
    revisionId: string,
  ) => PluginsV2RevisionDiagnosticsSnapshot | undefined;
};

export class InvalidDiagnosticsAuditMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDiagnosticsAuditMetadataError';
  }
}

export class InvalidRevisionDiagnosticsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRevisionDiagnosticsInputError';
  }
}

type StoredEntry = {
  sequence: number;
  snapshot: PluginsV2RevisionDiagnosticsSnapshot;
};

export function createInMemoryPluginsV2DiagnosticsStore(
  seed?: readonly PluginsV2RevisionDiagnosticsSnapshotInput[],
): PluginsV2DiagnosticsStore {
  const entriesByRevisionId = new Map<string, StoredEntry[]>();
  let sequence = 0;

  const append = (
    input: PluginsV2RevisionDiagnosticsSnapshotInput,
  ): PluginsV2RevisionDiagnosticsSnapshot => {
    const revisionId = sanitizeRequiredField(
      input.revisionId,
      'revisionId is required for diagnostics persistence',
    );
    const snapshot: PluginsV2RevisionDiagnosticsSnapshot = {
      revisionId,
      diagnostics: sortPluginBuildDiagnostics(input.diagnostics).map(
        cloneDiagnostic,
      ),
      audit: normalizeAudit(input.audit),
    };

    const existing = entriesByRevisionId.get(revisionId) ?? [];
    const appended: StoredEntry = {
      sequence,
      snapshot,
    };
    sequence += 1;

    entriesByRevisionId.set(revisionId, [...existing, appended]);
    return cloneSnapshot(snapshot);
  };

  for (const input of seed ?? []) {
    append(input);
  }

  return {
    appendRevisionDiagnostics(input) {
      return append(input);
    },

    listRevisionDiagnostics(revisionId) {
      const normalizedRevisionId = sanitizeRequiredField(
        revisionId,
        'revisionId is required when reading diagnostics',
      );
      const stored = entriesByRevisionId.get(normalizedRevisionId) ?? [];

      return stored
        .slice()
        .sort((left, right) => {
          const timestampOrder = left.snapshot.audit.timestamp.localeCompare(
            right.snapshot.audit.timestamp,
          );
          if (timestampOrder !== 0) {
            return timestampOrder;
          }

          return left.sequence - right.sequence;
        })
        .map((entry) => cloneSnapshot(entry.snapshot));
    },

    getLatestRevisionDiagnostics(revisionId) {
      const snapshots = this.listRevisionDiagnostics(revisionId);
      return snapshots.at(-1);
    },
  };
}

function normalizeAudit(
  audit: PluginsV2DiagnosticsAuditMetadata,
): PluginsV2DiagnosticsAuditMetadata {
  const compilerVersion = sanitizeRequiredField(
    audit.compilerVersion,
    'audit.compilerVersion is required',
  );
  const actorUserId = sanitizeRequiredField(
    audit.actorUserId,
    'audit.actorUserId is required',
  );
  const timestamp = sanitizeRequiredField(
    audit.timestamp,
    'audit.timestamp is required',
  );

  if (!isIsoTimestamp(timestamp)) {
    throw new InvalidDiagnosticsAuditMetadataError(
      'audit.timestamp must be a valid ISO-8601 UTC timestamp',
    );
  }

  return {
    compilerVersion,
    actorUserId,
    timestamp,
  };
}

function sanitizeRequiredField(value: string, message: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new InvalidRevisionDiagnosticsInputError(message);
  }

  return normalized;
}

function isIsoTimestamp(timestamp: string): boolean {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString() === timestamp;
}

function cloneSnapshot(
  snapshot: PluginsV2RevisionDiagnosticsSnapshot,
): PluginsV2RevisionDiagnosticsSnapshot {
  return {
    revisionId: snapshot.revisionId,
    diagnostics: snapshot.diagnostics.map(cloneDiagnostic),
    audit: {
      compilerVersion: snapshot.audit.compilerVersion,
      actorUserId: snapshot.audit.actorUserId,
      timestamp: snapshot.audit.timestamp,
    },
  };
}

function cloneDiagnostic(
  diagnostic: PluginBuildDiagnostic,
): PluginBuildDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    path: [...diagnostic.path],
    message: diagnostic.message,
    fixHint: diagnostic.fixHint,
  };
}
