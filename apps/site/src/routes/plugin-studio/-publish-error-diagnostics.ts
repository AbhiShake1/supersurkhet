export type PublishFailureDiagnostic = {
  code?: string;
  severity?: string;
  message: string;
  path?: string;
};

type PublishFailureToastPayload = {
  title: string;
  description?: string;
};

const MAX_TOAST_DIAGNOSTICS = 3;
const MAX_COLLECTED_DIAGNOSTICS = 8;

export function toErrorMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const messageCandidates = [
      record.message,
      record.error,
      record.reason,
      record.details,
    ];
    for (const candidate of messageCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    if (Array.isArray(record.issues)) {
      const firstIssue = record.issues[0] as { message?: unknown } | undefined;
      if (
        typeof firstIssue?.message === 'string' &&
        firstIssue.message.trim()
      ) {
        return firstIssue.message.trim();
      }
    }
  }
  return 'Unknown error';
}

function normalizePath(path: unknown): string | undefined {
  if (typeof path === 'string' && path.trim()) {
    return path.trim();
  }
  if (Array.isArray(path)) {
    const normalized = path
      .map((segment) =>
        typeof segment === 'string' || typeof segment === 'number'
          ? String(segment)
          : '',
      )
      .filter(Boolean)
      .join('.');
    return normalized || undefined;
  }
  return undefined;
}

function extractDiagnosticCandidate(
  value: unknown,
): PublishFailureDiagnostic | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.message !== 'string' || !record.message.trim()) return null;
  const code = typeof record.code === 'string' ? record.code : undefined;
  const severity =
    typeof record.severity === 'string' ? record.severity : undefined;
  const path =
    normalizePath(record.path) ??
    normalizePath(record.location) ??
    normalizePath(record.pointer);
  if (!code && !severity && !path) {
    return null;
  }
  return {
    code,
    severity,
    message: record.message.trim(),
    path,
  };
}

export function extractPublishFailureDiagnostics(
  error: unknown,
): PublishFailureDiagnostic[] {
  const stack: unknown[] = [error];
  const seen = new WeakSet<object>();
  const diagnostics: PublishFailureDiagnostic[] = [];
  const dedupe = new Set<string>();

  while (stack.length > 0 && diagnostics.length < MAX_COLLECTED_DIAGNOSTICS) {
    const candidate = stack.pop();
    const extracted = extractDiagnosticCandidate(candidate);
    if (extracted) {
      const key = `${extracted.code ?? ''}|${extracted.path ?? ''}|${extracted.message}`;
      if (!dedupe.has(key)) {
        diagnostics.push(extracted);
        dedupe.add(key);
      }
    }
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        stack.push(item);
      }
      continue;
    }
    for (const nested of Object.values(candidate as Record<string, unknown>)) {
      stack.push(nested);
    }
  }

  return diagnostics;
}

function formatDiagnosticLine(diagnostic: PublishFailureDiagnostic) {
  const pathSuffix = diagnostic.path ? ` (${diagnostic.path})` : '';
  return `- ${diagnostic.message}${pathSuffix}`;
}

export function buildPublishFailureToastPayload(
  error: unknown,
): PublishFailureToastPayload {
  const diagnostics = extractPublishFailureDiagnostics(error);
  if (diagnostics.length === 0) {
    return {
      title: 'Publish failed',
      description: toErrorMessage(error),
    };
  }
  const visibleDiagnostics = diagnostics.slice(0, MAX_TOAST_DIAGNOSTICS);
  const additionalCount = diagnostics.length - visibleDiagnostics.length;
  const descriptionLines = [
    ...visibleDiagnostics.map(formatDiagnosticLine),
    ...(additionalCount > 0
      ? [`- +${additionalCount} more diagnostic(s) in V3 Diagnostics.`]
      : []),
  ];
  return {
    title: 'Publish blocked by diagnostics',
    description: descriptionLines.join('\n'),
  };
}
