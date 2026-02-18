import type { CompileVerifyDiagnostic } from '@/server-functions/plugins-v2-compile-verify';

export type ReviewDiagnosticsArtifactDiff = {
  added: string[];
  changed: string[];
  removed: string[];
};

export type ReviewDiagnosticsHashPreview = {
  manifestHash: string;
  artifactHash: string;
};

export type ReviewDiagnosticsChangelogEntry = {
  label: string;
  summary: string;
};

export type ReviewDiagnosticsTabProps = {
  diagnostics: CompileVerifyDiagnostic[];
  artifactDiff: ReviewDiagnosticsArtifactDiff;
  hashPreview: ReviewDiagnosticsHashPreview;
  changelog: ReviewDiagnosticsChangelogEntry[];
};

export type ReviewDiagnosticsBlockingState = {
  isBlocking: boolean;
  label: 'Blocking' | 'Ready';
  blockingCount: number;
};

type ReviewDiagnosticSeverity = CompileVerifyDiagnostic['severity'];

type GroupedDiagnosticBucket = {
  path: string;
  diagnostics: CompileVerifyDiagnostic[];
};

const SEVERITY_ORDER: ReviewDiagnosticSeverity[] = ['error', 'warning', 'info'];

export function getReviewDiagnosticsBlockingState(
  diagnostics: readonly CompileVerifyDiagnostic[],
): ReviewDiagnosticsBlockingState {
  const blockingCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length;

  return {
    isBlocking: blockingCount > 0,
    label: blockingCount > 0 ? 'Blocking' : 'Ready',
    blockingCount,
  };
}

export function ReviewDiagnosticsTab({
  diagnostics,
  artifactDiff,
  hashPreview,
  changelog,
}: ReviewDiagnosticsTabProps) {
  const blockingState = getReviewDiagnosticsBlockingState(diagnostics);
  const groupedBySeverityAndPath = groupDiagnosticsBySeverityAndPath(diagnostics);

  return (
    <section aria-label="Review diagnostics tab">
      <h2>Review Diagnostics</h2>

      <article>
        <h3>Publish Gate</h3>
        <p>{blockingState.label}</p>
        <p>{formatSeveritySummary(diagnostics)}</p>
      </article>

      <article>
        <h3>Diagnostics</h3>
        {diagnostics.length === 0 ? (
          <p>No diagnostics to review</p>
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const buckets = groupedBySeverityAndPath[severity];
            if (buckets.length === 0) {
              return null;
            }

            return (
              <section key={severity} aria-label={`${severity} diagnostics`}>
                <h4>{formatSeverityLabel(severity)}</h4>
                <ul>
                  {buckets.map((bucket) => (
                    <li key={`${severity}:${bucket.path}`}>
                      <p>{bucket.path}</p>
                      <ul>
                        {bucket.diagnostics.map((diagnostic, index) => (
                          <li
                            key={`${diagnostic.code}:${diagnostic.message}:${index}`}
                          >
                            {diagnostic.message}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </article>

      <section aria-label="Artifact preview panels">
        <article>
          <h3>Artifact Diff</h3>
          <h4>Added</h4>
          {artifactDiff.added.length === 0 ? (
            <p>No added artifacts</p>
          ) : (
            <ul>
              {artifactDiff.added.map((entry) => (
                <li key={`added:${entry}`}>{entry}</li>
              ))}
            </ul>
          )}

          <h4>Changed</h4>
          {artifactDiff.changed.length === 0 ? (
            <p>No changed artifacts</p>
          ) : (
            <ul>
              {artifactDiff.changed.map((entry) => (
                <li key={`changed:${entry}`}>{entry}</li>
              ))}
            </ul>
          )}

          <h4>Removed</h4>
          {artifactDiff.removed.length === 0 ? (
            <p>No removed artifacts</p>
          ) : (
            <ul>
              {artifactDiff.removed.map((entry) => (
                <li key={`removed:${entry}`}>{entry}</li>
              ))}
            </ul>
          )}
        </article>

        <article>
          <h3>Hash Preview</h3>
          <dl>
            <dt>Manifest hash</dt>
            <dd>{hashPreview.manifestHash}</dd>
            <dt>Artifact hash</dt>
            <dd>{hashPreview.artifactHash}</dd>
          </dl>
        </article>
      </section>

      <article>
        <h3>Changelog Summary</h3>
        {changelog.length === 0 ? (
          <p>No changelog entries yet</p>
        ) : (
          <ul>
            {changelog.map((entry, index) => (
              <li key={`${entry.label}:${index}`}>
                <strong>{entry.label}</strong>: {entry.summary}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function groupDiagnosticsBySeverityAndPath(
  diagnostics: readonly CompileVerifyDiagnostic[],
): Record<ReviewDiagnosticSeverity, GroupedDiagnosticBucket[]> {
  const grouped = {
    error: new Map<string, CompileVerifyDiagnostic[]>(),
    warning: new Map<string, CompileVerifyDiagnostic[]>(),
    info: new Map<string, CompileVerifyDiagnostic[]>(),
  } satisfies Record<ReviewDiagnosticSeverity, Map<string, CompileVerifyDiagnostic[]>>;

  for (const diagnostic of diagnostics) {
    const path = diagnostic.path.join('.');
    const bucket = grouped[diagnostic.severity].get(path) ?? [];
    bucket.push(diagnostic);
    grouped[diagnostic.severity].set(path, bucket);
  }

  return {
    error: sortBuckets(grouped.error),
    warning: sortBuckets(grouped.warning),
    info: sortBuckets(grouped.info),
  };
}

function sortBuckets(
  entries: Map<string, CompileVerifyDiagnostic[]>,
): GroupedDiagnosticBucket[] {
  return [...entries.entries()]
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .map(([path, diagnostics]) => ({
      path,
      diagnostics: [...diagnostics].sort((left, right) => {
        const leftKey = `${left.code}:${left.message}`;
        const rightKey = `${right.code}:${right.message}`;
        return leftKey.localeCompare(rightKey);
      }),
    }));
}

function formatSeveritySummary(diagnostics: readonly CompileVerifyDiagnostic[]): string {
  const counts = diagnostics.reduce(
    (acc, diagnostic) => {
      acc[diagnostic.severity] += 1;
      return acc;
    },
    {
      error: 0,
      warning: 0,
      info: 0,
    } satisfies Record<ReviewDiagnosticSeverity, number>,
  );

  return `${formatCount(counts.error, 'error')}, ${formatCount(
    counts.warning,
    'warning',
  )}, ${formatCount(counts.info, 'info')}`;
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function formatSeverityLabel(severity: ReviewDiagnosticSeverity): string {
  if (severity === 'error') {
    return 'Errors';
  }

  if (severity === 'warning') {
    return 'Warnings';
  }

  return 'Info';
}
