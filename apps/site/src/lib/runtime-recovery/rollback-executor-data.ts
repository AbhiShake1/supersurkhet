import type { PluginRecordDoc } from '@/lib/plugins/types';
import type {
  RollbackExecutionFailureDoc,
  RollbackExecutionStepResultDoc,
} from './rollback-health-verify';

export type PluginDataSnapshotRollbackDoc = {
  snapshotId: string;
  businessId: string;
  pluginId: string;
  namespacePrefix: string;
  rows: PluginRecordDoc[];
};

export type PluginDataRollbackStore = {
  listRecords: (params: {
    businessId: string;
    pluginId: string;
  }) => Promise<PluginRecordDoc[]> | PluginRecordDoc[];
  upsertRecords: (records: PluginRecordDoc[]) => Promise<void> | void;
  deleteRecords: (namespacePaths: string[]) => Promise<void> | void;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}

function normalizeRecord(record: PluginRecordDoc): string {
  return stableStringify({
    id: record.id,
    businessId: record.businessId,
    pluginId: record.pluginId,
    schemaId: record.schemaId,
    rowId: record.rowId,
    namespacePath: record.namespacePath,
    payload: record.payload,
  });
}

function ensureSnapshotSafety(
  snapshot: PluginDataSnapshotRollbackDoc,
): RollbackExecutionFailureDoc | undefined {
  if (!snapshot.namespacePrefix.trim()) {
    return {
      code: 'unsafe_namespace_prefix',
      message: 'Snapshot namespace prefix is empty.',
      recoverable: false,
    };
  }

  const requiredPrefix = `${snapshot.businessId}/${snapshot.pluginId}/`;
  if (!snapshot.namespacePrefix.startsWith(requiredPrefix)) {
    return {
      code: 'unsafe_namespace_prefix',
      message: `Snapshot namespace prefix must start with "${requiredPrefix}".`,
      recoverable: false,
    };
  }

  for (const row of snapshot.rows) {
    if (
      row.businessId !== snapshot.businessId ||
      row.pluginId !== snapshot.pluginId ||
      !row.namespacePath.startsWith(snapshot.namespacePrefix)
    ) {
      return {
        code: 'snapshot_namespace_mismatch',
        message:
          'Snapshot contains rows that do not match business/plugin identity or namespace prefix.',
        recoverable: false,
      };
    }
  }

  return undefined;
}

export async function executeDataSnapshotRollback(input: {
  stepId?: string;
  store: PluginDataRollbackStore;
  snapshot: PluginDataSnapshotRollbackDoc;
}): Promise<RollbackExecutionStepResultDoc> {
  const stepId = input.stepId ?? `data-snapshot:${input.snapshot.snapshotId}`;

  const safetyFailure = ensureSnapshotSafety(input.snapshot);
  if (safetyFailure) {
    return {
      stepId,
      target: 'data-snapshot',
      status: 'failed',
      failureReasons: [safetyFailure],
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
      },
    };
  }

  let currentRows: PluginRecordDoc[];
  try {
    currentRows = await input.store.listRecords({
      businessId: input.snapshot.businessId,
      pluginId: input.snapshot.pluginId,
    });
  } catch (error) {
    return {
      stepId,
      target: 'data-snapshot',
      status: 'failed',
      failureReasons: [
        {
          code: 'snapshot_read_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to read current plugin records before rollback.',
          recoverable: true,
        },
      ],
    };
  }

  const currentScopedRows = currentRows.filter((row) =>
    row.namespacePath.startsWith(input.snapshot.namespacePrefix),
  );
  const currentByNamespacePath = new Map(
    currentScopedRows.map((row) => [row.namespacePath, row]),
  );
  const targetByNamespacePath = new Map(
    input.snapshot.rows.map((row) => [row.namespacePath, row]),
  );

  const toUpsert: PluginRecordDoc[] = [];
  for (const [namespacePath, targetRow] of targetByNamespacePath) {
    const currentRow = currentByNamespacePath.get(namespacePath);
    if (
      !currentRow ||
      normalizeRecord(currentRow) !== normalizeRecord(targetRow)
    ) {
      toUpsert.push(targetRow);
    }
  }

  const toDelete = [...currentByNamespacePath.keys()].filter(
    (namespacePath) => !targetByNamespacePath.has(namespacePath),
  );

  if (toUpsert.length === 0 && toDelete.length === 0) {
    return {
      stepId,
      target: 'data-snapshot',
      status: 'noop',
      failureReasons: [],
      details: {
        upsertedCount: 0,
        deletedCount: 0,
      },
    };
  }

  try {
    if (toUpsert.length) {
      await input.store.upsertRecords(toUpsert);
    }
  } catch (error) {
    return {
      stepId,
      target: 'data-snapshot',
      status: 'failed',
      failureReasons: [
        {
          code: 'snapshot_write_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to upsert snapshot rows during rollback.',
          recoverable: true,
        },
      ],
      details: {
        upsertedCount: 0,
        pendingUpsertCount: toUpsert.length,
        pendingDeleteCount: toDelete.length,
      },
    };
  }

  try {
    if (toDelete.length) {
      await input.store.deleteRecords(toDelete);
    }
  } catch (error) {
    return {
      stepId,
      target: 'data-snapshot',
      status: 'partial',
      failureReasons: [
        {
          code: 'snapshot_delete_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to delete out-of-snapshot rows during rollback.',
          recoverable: true,
        },
      ],
      details: {
        upsertedCount: toUpsert.length,
        pendingDeleteCount: toDelete.length,
      },
    };
  }

  return {
    stepId,
    target: 'data-snapshot',
    status: 'succeeded',
    failureReasons: [],
    details: {
      upsertedCount: toUpsert.length,
      deletedCount: toDelete.length,
    },
  };
}
