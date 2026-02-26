import { describe, expect, it } from 'vitest';
import type { BusinessInsightDoc } from './contracts';
import {
  type InsightEnginePort,
  type InsightExplanationPort,
  type InsightTelemetrySink,
  integrateBusinessInsights,
} from './index';

const baseEngineInput = {
  generatedAt: '2026-02-25T00:00:00.000Z',
  metricSeries: [],
  funnels: [],
  inventoryIndicators: [],
  workflowIndicators: [],
} as const;

const baseInsight: BusinessInsightDoc = {
  insightId: 'insight.collections',
  watcherId: 'collections-watcher',
  kind: 'trend-anomaly',
  title: 'Collections pressure is rising',
  summary: 'Receivables are high compared to recent revenue.',
  confidenceScore: 0.9,
  confidenceLevel: 'high',
  impactScore: 0.8,
  impactLevel: 'high',
  priorityScore: 0.86,
  recommendations: ['Tighten follow-up cadence for overdue invoices.'],
  sourceRefs: [
    {
      schemaId: 'finance',
      metricKey: 'accountsReceivable',
      table: 'summary',
      value: 25_000,
    },
  ],
  metrics: {
    receivableRatio: 0.25,
  },
  detectedAt: '2026-02-25T00:00:00.000Z',
};

function createEngine(insights: BusinessInsightDoc[]): InsightEnginePort {
  return {
    generateInsights: () => insights,
  };
}

function createExplainer(
  overrides?: Partial<
    ReturnType<InsightExplanationPort['explainInsights']>[number]
  >,
): InsightExplanationPort {
  return {
    explainInsights(insights) {
      return insights.map((insight) => ({
        id: insight.insightId,
        title: insight.title,
        suggestion: insight.recommendations[0] ?? insight.summary,
        explanation:
          'Receivables are 25% of revenue, so a follow-up collection workflow is recommended.',
        confidence: {
          score: insight.confidenceScore,
          label: insight.confidenceLevel,
        },
        impact: {
          score: insight.impactScore,
          label: insight.impactLevel,
        },
        sources: [
          {
            type: 'metric',
            id: 'accountsReceivable',
            label: 'Accounts Receivable',
          },
        ],
        sanitized: false,
        ...overrides,
      }));
    },
  };
}

describe('insights integration facade', () => {
  it('delivers insight when confidence and explainability gates pass', () => {
    const result = integrateBusinessInsights({
      engineInput: baseEngineInput,
      engine: createEngine([baseInsight]),
      explainer: createExplainer(),
      confidenceThreshold: 0.7,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.delivered).toBe(true);
    expect(result.items[0]?.fallbackReason).toBeUndefined();
    expect(result.counters.insightsDelivered).toBe(1);
    expect(result.counters.fallbackUsed).toBe(0);
    expect(result.runtimeTelemetry.severity).toBe('info');
  });

  it('falls back when confidence is below threshold', () => {
    const result = integrateBusinessInsights({
      engineInput: baseEngineInput,
      engine: createEngine([
        {
          ...baseInsight,
          confidenceScore: 0.51,
          confidenceLevel: 'medium',
        },
      ]),
      explainer: createExplainer({
        confidence: {
          score: 0.51,
          label: 'medium',
        },
      }),
      confidenceThreshold: 0.8,
      fallbackMessage: 'Fallback content.',
    });

    expect(result.items[0]?.delivered).toBe(false);
    expect(result.items[0]?.fallbackReason).toBe('low-confidence');
    expect(result.items[0]?.explanation).toBe('Fallback content.');
    expect(result.counters.confidenceRejected).toBe(1);
    expect(result.counters.fallbackUsed).toBe(1);
    expect(result.runtimeTelemetry.severity).toBe('warn');
  });

  it('falls back when explanation quality gate rejects sanitized content', () => {
    const result = integrateBusinessInsights({
      engineInput: baseEngineInput,
      engine: createEngine([baseInsight]),
      explainer: createExplainer({
        explanation: 'Token data was redacted for this insight.',
        sanitized: true,
      }),
      confidenceThreshold: 0.7,
    });

    expect(result.items[0]?.delivered).toBe(false);
    expect(result.items[0]?.fallbackReason).toBe('quality-check-failed');
    expect(result.counters.qualityRejected).toBe(1);
  });

  it('records telemetry counters to sink for observability hooks', () => {
    const recorded: Array<{ counter: string; value: number }> = [];
    const sink: InsightTelemetrySink = {
      recordCounter(counter, value = 1) {
        recorded.push({ counter, value });
      },
    };

    integrateBusinessInsights({
      engineInput: baseEngineInput,
      engine: createEngine([baseInsight]),
      explainer: createExplainer(),
      telemetrySink: sink,
    });

    expect(recorded).toEqual([
      { counter: 'business_insights_evaluated', value: 1 },
      { counter: 'business_insights_delivered', value: 1 },
      { counter: 'business_insights_fallback_used', value: 0 },
      { counter: 'business_insights_confidence_rejected', value: 0 },
      { counter: 'business_insights_quality_rejected', value: 0 },
    ]);
  });
});
