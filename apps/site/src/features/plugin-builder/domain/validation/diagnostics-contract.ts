import type { ActionCapabilityValidationCode } from './action-capability-validator';
import type { WorkflowDagValidatorDiagnosticCode } from './workflow-dag-validator';

export type PluginBuildDiagnosticSeverity = 'error' | 'warning' | 'info';

export type PluginBuildDiagnosticCode =
  | WorkflowDagValidatorDiagnosticCode
  | ActionCapabilityValidationCode
  | (string & {});

export type PluginBuildDiagnostic = {
  code: PluginBuildDiagnosticCode;
  severity: PluginBuildDiagnosticSeverity;
  path: string[];
  message: string;
  fixHint?: string;
};

export type PluginBuildDiagnosticInput = Omit<
  PluginBuildDiagnostic,
  'severity'
>;

const ERROR_DIAGNOSTIC_CODES = new Set<PluginBuildDiagnosticCode>([
  'missing-node-id',
  'duplicate-node-id',
  'invalid-node-type',
  'missing-node-action-id',
  'missing-edge-from',
  'missing-edge-to',
  'edge-node-not-found',
  'missing-branch-condition',
  'cycle-detected',
  'unknown-action',
  'runtime-target-mismatch',
]);

const WARNING_DIAGNOSTIC_CODES = new Set<PluginBuildDiagnosticCode>([
  'disconnected-node',
  'unreachable-terminal',
  'missing-capability',
  'denied-action',
]);

const SEVERITY_PRIORITY: Record<PluginBuildDiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function classifyPluginBuildDiagnosticSeverity(
  code: PluginBuildDiagnosticCode,
): PluginBuildDiagnosticSeverity {
  if (ERROR_DIAGNOSTIC_CODES.has(code)) {
    return 'error';
  }

  if (WARNING_DIAGNOSTIC_CODES.has(code)) {
    return 'warning';
  }

  return 'info';
}

function compareDiagnostics(
  left: PluginBuildDiagnostic,
  right: PluginBuildDiagnostic,
): number {
  const severityDiff =
    SEVERITY_PRIORITY[left.severity] - SEVERITY_PRIORITY[right.severity];
  if (severityDiff !== 0) {
    return severityDiff;
  }

  const pathDiff = comparePathSegments(left.path, right.path);
  if (pathDiff !== 0) {
    return pathDiff;
  }

  const codeDiff = left.code.localeCompare(right.code);
  if (codeDiff !== 0) {
    return codeDiff;
  }

  const messageDiff = left.message.localeCompare(right.message);
  if (messageDiff !== 0) {
    return messageDiff;
  }

  return (left.fixHint ?? '').localeCompare(right.fixHint ?? '');
}

function comparePathSegments(
  left: readonly string[],
  right: readonly string[],
): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const segmentDiff = left[index].localeCompare(right[index]);
    if (segmentDiff !== 0) {
      return segmentDiff;
    }
  }

  return left.length - right.length;
}

export function sortPluginBuildDiagnostics(
  diagnostics: readonly PluginBuildDiagnostic[],
): PluginBuildDiagnostic[] {
  return [...diagnostics].sort(compareDiagnostics);
}

export function normalizePluginBuildDiagnostics(
  diagnostics: readonly PluginBuildDiagnosticInput[],
): PluginBuildDiagnostic[] {
  const normalized = diagnostics.map((diagnostic) => ({
    ...diagnostic,
    severity: classifyPluginBuildDiagnosticSeverity(diagnostic.code),
  }));

  return sortPluginBuildDiagnostics(normalized);
}
