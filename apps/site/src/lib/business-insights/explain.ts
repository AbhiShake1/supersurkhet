export type InsightSourceType = 'schema-field' | 'table' | 'metric';

export interface InsightSourceReference {
  type: InsightSourceType;
  id: string;
  label: string;
}

export interface InsightDraft {
  id: string;
  title: string;
  suggestion: string;
  reasoning: string;
  confidenceScore: number;
  impactScore: number;
  sources: readonly InsightSourceReference[];
}

export interface AssistantInsightExplanation {
  id: string;
  title: string;
  suggestion: string;
  explanation: string;
  confidence: {
    score: number;
    label: 'low' | 'medium' | 'high';
  };
  impact: {
    score: number;
    label: 'low' | 'medium' | 'high';
  };
  sources: readonly InsightSourceReference[];
  sanitized: boolean;
}

const SENSITIVE_FIELD_PATTERN =
  /\b(password|passcode|secret|token|api[_ -]?key|private[_ -]?key|ssn|cvv|card[_ -]?number)\b/i;
const SENSITIVE_VALUE_PATTERN =
  /\b(password|passcode|secret|token|api[_ -]?key|private[_ -]?key|ssn|cvv|card[_ -]?number)\b\s*[:=]\s*([^\s,;]+)/gi;

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return Number(score.toFixed(2));
}

function scoreLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function redactSensitiveContent(value: string): {
  value: string;
  redacted: boolean;
} {
  let redacted = false;
  const withValueRedactions = value.replace(
    SENSITIVE_VALUE_PATTERN,
    (_match, key: string) => {
      redacted = true;
      return `${key}: [REDACTED]`;
    },
  );

  if (SENSITIVE_FIELD_PATTERN.test(withValueRedactions)) {
    redacted = true;
    return {
      value: withValueRedactions.replace(
        SENSITIVE_FIELD_PATTERN,
        '[REDACTED_FIELD]',
      ),
      redacted,
    };
  }

  return { value: withValueRedactions, redacted };
}

function sanitizeSourceReference(source: InsightSourceReference): {
  source: InsightSourceReference;
  redacted: boolean;
} {
  const idResult = redactSensitiveContent(source.id);
  const labelResult = redactSensitiveContent(source.label);
  return {
    source: {
      ...source,
      id: idResult.value,
      label: labelResult.value,
    },
    redacted: idResult.redacted || labelResult.redacted,
  };
}

export function buildAssistantInsightExplanations(
  insights: readonly InsightDraft[],
): AssistantInsightExplanation[] {
  return insights.map((insight) => {
    const titleResult = redactSensitiveContent(insight.title);
    const suggestionResult = redactSensitiveContent(insight.suggestion);
    const reasoningResult = redactSensitiveContent(insight.reasoning);
    let sourcesRedacted = false;
    const sanitizedSources = insight.sources.map((source) => {
      const sanitized = sanitizeSourceReference(source);
      if (sanitized.redacted) {
        sourcesRedacted = true;
      }
      return sanitized.source;
    });

    const confidenceScore = clampScore(insight.confidenceScore);
    const impactScore = clampScore(insight.impactScore);

    return {
      id: insight.id,
      title: titleResult.value,
      suggestion: suggestionResult.value,
      explanation: reasoningResult.value,
      confidence: {
        score: confidenceScore,
        label: scoreLabel(confidenceScore),
      },
      impact: {
        score: impactScore,
        label: scoreLabel(impactScore),
      },
      sources: sanitizedSources,
      sanitized:
        titleResult.redacted ||
        suggestionResult.redacted ||
        reasoningResult.redacted ||
        sourcesRedacted,
    };
  });
}
