import type {
  BusinessInsightDoc,
  BusinessInsightEngineInput,
} from './contracts';
import { generateBusinessInsights } from './engine';
import {
  type AssistantInsightExplanation,
  buildAssistantInsightExplanations,
} from './explain';

export interface InsightTelemetrySink {
  recordCounter(counter: string, value?: number): void;
}

export interface InsightDeliveryItem {
  insightId: string;
  title: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  sourceRefs: Array<{
    type: 'schema-field' | 'table' | 'metric';
    id: string;
    label: string;
  }>;
  explanation: string;
  delivered: boolean;
  fallbackReason?: 'low-confidence' | 'quality-check-failed';
}

export interface InsightTelemetryCounters {
  insightsEvaluated: number;
  insightsDelivered: number;
  fallbackUsed: number;
  confidenceRejected: number;
  qualityRejected: number;
}

export interface InsightDeliveryResult {
  items: InsightDeliveryItem[];
  fallbackMessage: string;
  counters: InsightTelemetryCounters;
  runtimeTelemetry: {
    surface: 'assistant';
    severity: 'info' | 'warn';
    metrics: Record<string, number>;
    attributes: Record<string, string | number | boolean>;
  };
}

export interface InsightEnginePort {
  generateInsights(input: BusinessInsightEngineInput): BusinessInsightDoc[];
}

export interface InsightExplanationPort {
  explainInsights(
    insights: readonly BusinessInsightDoc[],
  ): AssistantInsightExplanation[];
}

export interface IntegrateBusinessInsightsInput {
  engineInput: BusinessInsightEngineInput;
  engine?: InsightEnginePort;
  explainer?: InsightExplanationPort;
  confidenceThreshold?: number;
  fallbackMessage?: string;
  telemetrySink?: InsightTelemetrySink;
}

const defaultFallbackMessage =
  'Insights are temporarily unavailable; showing conservative guidance while more data is collected.';

const defaultEngine: InsightEnginePort = {
  generateInsights(input) {
    return generateBusinessInsights(input).insights;
  },
};

const defaultExplainer: InsightExplanationPort = {
  explainInsights(insights) {
    return buildAssistantInsightExplanations(
      insights.map((insight) => ({
        id: insight.insightId,
        title: insight.title,
        suggestion: insight.recommendations[0] ?? insight.summary,
        reasoning: insight.summary,
        confidenceScore: insight.confidenceScore,
        impactScore: insight.impactScore,
        sources: insight.sourceRefs.map((source) => ({
          type: toExplanationSourceType(source),
          id: source.metricKey,
          label: source.table ?? source.metricKey,
        })),
      })),
    );
  },
};

function toExplanationSourceType(source: {
  metricKey: string;
  table?: string;
}): 'schema-field' | 'table' | 'metric' {
  if (source.table) {
    return 'table';
  }
  if (source.metricKey.includes('.')) {
    return 'schema-field';
  }
  return 'metric';
}

function hasExplainabilityCoverage(
  insight: BusinessInsightDoc,
  explanation: AssistantInsightExplanation | undefined,
): boolean {
  if (!explanation) {
    return false;
  }

  if (!explanation.explanation.trim()) {
    return false;
  }

  if (insight.sourceRefs.length === 0 || explanation.sources.length === 0) {
    return false;
  }

  return !explanation.sanitized;
}

export function integrateBusinessInsights(
  input: IntegrateBusinessInsightsInput,
): InsightDeliveryResult {
  const confidenceThreshold = input.confidenceThreshold ?? 0.65;
  const fallbackMessage = input.fallbackMessage ?? defaultFallbackMessage;
  const engine = input.engine ?? defaultEngine;
  const explainer = input.explainer ?? defaultExplainer;
  const insights = engine.generateInsights(input.engineInput);
  const explanations = explainer.explainInsights(insights);
  const explanationByInsightId = new Map(
    explanations.map((item) => [item.id, item]),
  );

  const counters: InsightTelemetryCounters = {
    insightsEvaluated: insights.length,
    insightsDelivered: 0,
    fallbackUsed: 0,
    confidenceRejected: 0,
    qualityRejected: 0,
  };

  const items = insights.map((insight): InsightDeliveryItem => {
    const explanation = explanationByInsightId.get(insight.insightId);
    const confidenceScore =
      explanation?.confidence.score ?? insight.confidenceScore;
    const meetsConfidence = confidenceScore >= confidenceThreshold;
    const meetsQuality = hasExplainabilityCoverage(insight, explanation);

    if (meetsConfidence && meetsQuality && explanation) {
      counters.insightsDelivered += 1;
      return {
        insightId: insight.insightId,
        title: explanation.title,
        confidence: confidenceScore,
        impact: explanation.impact.label,
        sourceRefs: [...explanation.sources],
        explanation: explanation.explanation,
        delivered: true,
      };
    }

    counters.fallbackUsed += 1;
    if (!meetsConfidence) {
      counters.confidenceRejected += 1;
    }
    if (!meetsQuality) {
      counters.qualityRejected += 1;
    }

    return {
      insightId: insight.insightId,
      title: insight.title,
      confidence: confidenceScore,
      impact: insight.impactLevel,
      sourceRefs: (explanation?.sources ?? []).slice(),
      explanation: fallbackMessage,
      delivered: false,
      fallbackReason: meetsConfidence
        ? 'quality-check-failed'
        : 'low-confidence',
    };
  });

  input.telemetrySink?.recordCounter(
    'business_insights_evaluated',
    insights.length,
  );
  input.telemetrySink?.recordCounter(
    'business_insights_delivered',
    counters.insightsDelivered,
  );
  input.telemetrySink?.recordCounter(
    'business_insights_fallback_used',
    counters.fallbackUsed,
  );
  input.telemetrySink?.recordCounter(
    'business_insights_confidence_rejected',
    counters.confidenceRejected,
  );
  input.telemetrySink?.recordCounter(
    'business_insights_quality_rejected',
    counters.qualityRejected,
  );

  return {
    items,
    fallbackMessage,
    counters,
    runtimeTelemetry: {
      surface: 'assistant',
      severity: counters.fallbackUsed > 0 ? 'warn' : 'info',
      metrics: {
        business_insights_evaluated: counters.insightsEvaluated,
        business_insights_delivered: counters.insightsDelivered,
        business_insights_fallback_used: counters.fallbackUsed,
        business_insights_confidence_rejected: counters.confidenceRejected,
        business_insights_quality_rejected: counters.qualityRejected,
      },
      attributes: {
        confidenceThreshold,
        explainabilityGate: true,
        cycle: 'D',
      },
    },
  };
}

export type { BusinessInsightEngineInput };
