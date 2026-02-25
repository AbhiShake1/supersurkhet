import {
  type BusinessInsightCandidate,
  type BusinessInsightDoc,
  type BusinessInsightEngineInput,
  type BusinessInsightEngineResult,
  type BusinessInsightWatcher,
  clamp01,
  insightIdFromFingerprint,
  levelFromScore,
} from './contracts';
import { createDefaultBusinessInsightWatchers } from './watchers';

export interface GenerateBusinessInsightsOptions {
  watchers?: readonly BusinessInsightWatcher[];
  maxInsights?: number;
}

export function generateBusinessInsights(
  input: BusinessInsightEngineInput,
  options: GenerateBusinessInsightsOptions = {},
): BusinessInsightEngineResult {
  const watchers =
    options.watchers && options.watchers.length > 0
      ? [...options.watchers]
      : createDefaultBusinessInsightWatchers();
  const maxInsights = Math.max(1, options.maxInsights ?? 12);

  const candidates = watchers
    .flatMap((watcher) => watcher.run(input))
    .map((candidate) => ({
      ...candidate,
      priorityScore: derivePriorityScore(candidate),
    }));

  const byInsightId = new Map<
    string,
    BusinessInsightCandidate & { priorityScore: number }
  >();

  for (const candidate of candidates) {
    const insightId = insightIdFromFingerprint(
      candidate.watcherId,
      candidate.fingerprint,
    );
    const current = byInsightId.get(insightId);
    if (!current || candidate.priorityScore > current.priorityScore) {
      byInsightId.set(insightId, candidate);
    }
  }

  const insights = [...byInsightId.entries()]
    .map(([insightId, candidate]) =>
      toInsightDoc(insightId, candidate, input.generatedAt),
    )
    .sort(compareInsightDocs)
    .slice(0, maxInsights);

  return {
    generatedAt: input.generatedAt,
    totalCandidates: candidates.length,
    insights,
  };
}

export function derivePriorityScore(candidate: BusinessInsightCandidate) {
  const sourceCoverageBoost = Math.min(candidate.sourceRefs.length, 3) * 0.02;
  return clamp01(
    candidate.impactScore * 0.58 +
      candidate.confidenceScore * 0.36 +
      sourceCoverageBoost,
  );
}

function toInsightDoc(
  insightId: string,
  candidate: BusinessInsightCandidate & { priorityScore: number },
  detectedAt: string,
): BusinessInsightDoc {
  const confidenceScore = clamp01(candidate.confidenceScore);
  const impactScore = clamp01(candidate.impactScore);
  const priorityScore = clamp01(candidate.priorityScore);

  return {
    insightId,
    watcherId: candidate.watcherId,
    kind: candidate.kind,
    title: candidate.title,
    summary: candidate.summary,
    confidenceScore,
    confidenceLevel: levelFromScore(confidenceScore),
    impactScore,
    impactLevel: levelFromScore(impactScore),
    priorityScore,
    recommendations: [...candidate.recommendations],
    sourceRefs: [...candidate.sourceRefs],
    metrics: { ...candidate.metrics },
    detectedAt,
  };
}

function compareInsightDocs(
  left: BusinessInsightDoc,
  right: BusinessInsightDoc,
) {
  if (right.priorityScore !== left.priorityScore) {
    return right.priorityScore - left.priorityScore;
  }
  if (right.impactScore !== left.impactScore) {
    return right.impactScore - left.impactScore;
  }
  if (right.confidenceScore !== left.confidenceScore) {
    return right.confidenceScore - left.confidenceScore;
  }
  return left.insightId.localeCompare(right.insightId);
}
