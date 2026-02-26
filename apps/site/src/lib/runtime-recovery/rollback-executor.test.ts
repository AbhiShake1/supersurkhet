import { describe, expect, it } from 'vitest';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginInstallDoc,
  JsonValue,
  PluginRecordDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import { executeDataSnapshotRollback } from './rollback-executor-data';
import { executePluginInstallRollback } from './rollback-executor-plugin';
import {
  buildRollbackExecutionResult,
  runPostRollbackHealthVerification,
} from './rollback-health-verify';

function buildRelease(version = '1.0.0'): PluginReleaseDoc {
  return {
    id: `acme.inventory@${version}`,
    pluginId: 'acme.inventory',
    version,
    manifestHash: `manifest-${version}`,
    artifactHash: `artifact-${version}`,
    author: { userId: 'owner-1' },
    visibility: 'public',
    actionManifest: [],
  };
}

function buildInstall(version = '1.0.0'): BusinessPluginInstallDoc {
  return {
    id: 'business-1::acme.inventory',
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    version,
    manifestHash: `manifest-${version}`,
    artifactHash: `artifact-${version}`,
    installedAt: '2026-01-01T00:00:00.000Z',
    installedByUserId: 'owner-1',
    status: 'active',
  };
}

function buildRecord(params: {
  rowId: string;
  payload: JsonValue;
}): PluginRecordDoc {
  return {
    id: `business-1/acme.inventory/inventory/${params.rowId}`,
    businessId: 'business-1',
    pluginId: 'acme.inventory',
    schemaId: 'inventory',
    rowId: params.rowId,
    namespacePath: `business-1/acme.inventory/inventory/${params.rowId}`,
    payload: params.payload,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('rollback executors', () => {
  it('returns noop for plugin install rollback when target is already applied', () => {
    const registry = createPluginRuntimeRegistry({
      releases: [buildRelease('1.0.0')],
      installs: [buildInstall('1.0.0')],
    });

    const result = executePluginInstallRollback({
      registry,
      snapshot: {
        snapshotId: 'plugin-snapshot-1',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        targetInstall: buildInstall('1.0.0'),
      },
    });

    expect(result.status).toBe('noop');
    expect(result.failureReasons).toEqual([]);
  });

  it('fails plugin rollback when target release does not exist', () => {
    const registry = createPluginRuntimeRegistry({
      releases: [buildRelease('1.0.0')],
      installs: [buildInstall('1.0.0')],
    });

    const result = executePluginInstallRollback({
      registry,
      snapshot: {
        snapshotId: 'plugin-snapshot-2',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        targetInstall: buildInstall('2.0.0'),
      },
    });

    expect(result.status).toBe('failed');
    expect(result.failureReasons[0]?.code).toBe('release_not_found');
  });

  it('rolls plugin data snapshot and reports partial when delete stage fails', async () => {
    const rows: PluginRecordDoc[] = [
      buildRecord({ rowId: 'keep', payload: { qty: 10 } }),
      buildRecord({ rowId: 'delete-me', payload: { qty: 99 } }),
    ];
    const upserted: PluginRecordDoc[] = [];
    const deleted: string[] = [];

    const result = await executeDataSnapshotRollback({
      store: {
        listRecords: () => rows,
        upsertRecords: (records) => {
          upserted.push(...records);
          for (const record of records) {
            const index = rows.findIndex(
              (row) => row.namespacePath === record.namespacePath,
            );
            if (index >= 0) {
              rows[index] = record;
            } else {
              rows.push(record);
            }
          }
        },
        deleteRecords: (namespacePaths) => {
          deleted.push(...namespacePaths);
          throw new Error('delete failed');
        },
      },
      snapshot: {
        snapshotId: 'data-snapshot-1',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        namespacePrefix: 'business-1/acme.inventory/inventory/',
        rows: [buildRecord({ rowId: 'keep', payload: { qty: 5 } })],
      },
    });

    expect(result.status).toBe('partial');
    expect(result.failureReasons[0]?.code).toBe('snapshot_delete_failed');
    expect(upserted).toHaveLength(1);
    expect(deleted).toHaveLength(1);
  });

  it('fails data rollback when snapshot namespace is unsafe', async () => {
    const result = await executeDataSnapshotRollback({
      store: {
        listRecords: () => [],
        upsertRecords: () => undefined,
        deleteRecords: () => undefined,
      },
      snapshot: {
        snapshotId: 'data-snapshot-2',
        businessId: 'business-1',
        pluginId: 'acme.inventory',
        namespacePrefix: 'business-1/other-plugin/inventory/',
        rows: [],
      },
    });

    expect(result.status).toBe('failed');
    expect(result.failureReasons[0]?.code).toBe('unsafe_namespace_prefix');
  });

  it('marks rollback as failed when health verification hook reports unhealthy', async () => {
    const healthStep = await runPostRollbackHealthVerification({
      context: {
        businessId: 'business-1',
        rollbackPlanId: 'plan-1',
        steps: [],
      },
      hook: async () => ({
        ok: false,
        reason: 'runtime still failing',
        details: { errorCount: 3 },
      }),
    });

    const result = buildRollbackExecutionResult({
      startedAt: '2026-02-25T00:00:00.000Z',
      completedAt: '2026-02-25T00:00:01.000Z',
      steps: [healthStep],
    });

    expect(healthStep.status).toBe('failed');
    expect(healthStep.failureReasons[0]?.code).toBe('health_check_failed');
    expect(result.status).toBe('failed');
  });
});
