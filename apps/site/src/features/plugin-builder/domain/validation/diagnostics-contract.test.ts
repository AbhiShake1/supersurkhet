import { describe, expect, it } from 'vitest';
import {
  classifyPluginBuildDiagnosticSeverity,
  normalizePluginBuildDiagnostics,
  type PluginBuildDiagnosticInput,
  sortPluginBuildDiagnostics,
} from './diagnostics-contract';

describe('diagnostics contract', () => {
  it('maps diagnostic codes to deterministic severities', () => {
    expect(classifyPluginBuildDiagnosticSeverity('cycle-detected')).toBe(
      'error',
    );
    expect(classifyPluginBuildDiagnosticSeverity('missing-capability')).toBe(
      'warning',
    );
    expect(classifyPluginBuildDiagnosticSeverity('custom-note')).toBe('info');
  });

  it('sorts diagnostics by severity path code message and fix hint', () => {
    const diagnostics = [
      {
        code: 'custom-note',
        severity: 'info',
        path: ['workflows', 'wf', 'nodes', 'n2'],
        message: 'Informational note',
      },
      {
        code: 'missing-capability',
        severity: 'warning',
        path: ['workflows', 'wf', 'nodes', 'n2'],
        message: 'Missing capability',
      },
      {
        code: 'cycle-detected',
        severity: 'error',
        path: ['workflows', 'wf', 'edges'],
        message: 'Workflow has a cycle',
      },
      {
        code: 'cycle-detected',
        severity: 'error',
        path: ['workflows', 'wf', 'edges'],
        message: 'Workflow has a cycle',
        fixHint: 'Remove back edge',
      },
    ] as const;

    const sorted = sortPluginBuildDiagnostics(diagnostics);

    expect(sorted).toEqual([
      diagnostics[2],
      diagnostics[3],
      diagnostics[1],
      diagnostics[0],
    ]);
    expect(sorted).not.toBe(diagnostics);
    expect(diagnostics).toEqual([
      {
        code: 'custom-note',
        severity: 'info',
        path: ['workflows', 'wf', 'nodes', 'n2'],
        message: 'Informational note',
      },
      {
        code: 'missing-capability',
        severity: 'warning',
        path: ['workflows', 'wf', 'nodes', 'n2'],
        message: 'Missing capability',
      },
      {
        code: 'cycle-detected',
        severity: 'error',
        path: ['workflows', 'wf', 'edges'],
        message: 'Workflow has a cycle',
      },
      {
        code: 'cycle-detected',
        severity: 'error',
        path: ['workflows', 'wf', 'edges'],
        message: 'Workflow has a cycle',
        fixHint: 'Remove back edge',
      },
    ]);
  });

  it('normalizes diagnostics by deriving severity then sorting deterministically', () => {
    const input: PluginBuildDiagnosticInput[] = [
      {
        code: 'custom-note',
        path: ['workflows', 'wf', 'nodes', '1'],
        message: 'Informational note',
      },
      {
        code: 'unknown-action',
        path: ['workflows', 'wf', 'nodes', '1', 'actionId'],
        message: 'Unknown action',
      },
      {
        code: 'missing-capability',
        path: ['workflows', 'wf', 'nodes', '2', 'actionId'],
        message: 'Missing capability',
      },
    ];

    expect(normalizePluginBuildDiagnostics(input)).toEqual([
      {
        code: 'unknown-action',
        severity: 'error',
        path: ['workflows', 'wf', 'nodes', '1', 'actionId'],
        message: 'Unknown action',
      },
      {
        code: 'missing-capability',
        severity: 'warning',
        path: ['workflows', 'wf', 'nodes', '2', 'actionId'],
        message: 'Missing capability',
      },
      {
        code: 'custom-note',
        severity: 'info',
        path: ['workflows', 'wf', 'nodes', '1'],
        message: 'Informational note',
      },
    ]);
  });
});
