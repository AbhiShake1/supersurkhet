import { describe, expect, it } from 'vitest';
import type { PluginBuildDiagnostic } from '@/features/plugin-builder/domain/validation/diagnostics-contract';
import {
  createInMemoryPluginsV2DiagnosticsStore,
  InvalidDiagnosticsAuditMetadataError,
} from './plugins-v2-diagnostics-store';

describe('plugins v2 diagnostics store', () => {
  it('appends diagnostics snapshots per revision and returns them in audit timestamp order', () => {
    const store = createInMemoryPluginsV2DiagnosticsStore();

    const first = store.appendRevisionDiagnostics({
      revisionId: 'rev-1',
      diagnostics: [
        {
          code: 'missing-node-id',
          severity: 'error',
          path: ['workflows', '0', 'nodes', '0'],
          message: 'Workflow node id is required',
        },
      ],
      audit: {
        compilerVersion: 'compiler@1.0.0',
        actorUserId: 'user-1',
        timestamp: '2026-02-18T10:00:00.000Z',
      },
    });

    const second = store.appendRevisionDiagnostics({
      revisionId: 'rev-1',
      diagnostics: [
        {
          code: 'missing-capability',
          severity: 'warning',
          path: ['workflows', '0', 'nodes', '1'],
          message: 'Action requires inventory:write',
        },
      ],
      audit: {
        compilerVersion: 'compiler@1.0.1',
        actorUserId: 'user-2',
        timestamp: '2026-02-18T10:05:00.000Z',
      },
    });

    const snapshots = store.listRevisionDiagnostics('rev-1');

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((snapshot) => snapshot.audit.timestamp)).toEqual([
      '2026-02-18T10:00:00.000Z',
      '2026-02-18T10:05:00.000Z',
    ]);
    expect(snapshots[0]).toEqual(first);
    expect(snapshots[1]).toEqual(second);
    expect(store.getLatestRevisionDiagnostics('rev-1')).toEqual(second);
  });

  it('keeps snapshots append-only when the same revision is written repeatedly', () => {
    const store = createInMemoryPluginsV2DiagnosticsStore();

    const diagnostics: PluginBuildDiagnostic[] = [
      {
        code: 'disconnected-node',
        severity: 'warning',
        path: ['workflows', '0', 'nodes', '2'],
        message: 'Node is disconnected',
      },
    ];

    store.appendRevisionDiagnostics({
      revisionId: 'rev-2',
      diagnostics,
      audit: {
        compilerVersion: 'compiler@2.0.0',
        actorUserId: 'user-3',
        timestamp: '2026-02-18T11:00:00.000Z',
      },
    });

    store.appendRevisionDiagnostics({
      revisionId: 'rev-2',
      diagnostics,
      audit: {
        compilerVersion: 'compiler@2.0.1',
        actorUserId: 'user-3',
        timestamp: '2026-02-18T11:00:00.000Z',
      },
    });

    expect(store.listRevisionDiagnostics('rev-2')).toHaveLength(2);
  });

  it('throws a typed error when audit metadata is invalid', () => {
    const store = createInMemoryPluginsV2DiagnosticsStore();

    expect(() => {
      store.appendRevisionDiagnostics({
        revisionId: 'rev-3',
        diagnostics: [],
        audit: {
          compilerVersion: 'compiler@2.0.1',
          actorUserId: 'user-3',
          timestamp: 'not-an-iso-timestamp',
        },
      });
    }).toThrowError(InvalidDiagnosticsAuditMetadataError);
  });
});
