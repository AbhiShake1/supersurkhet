import { describe, expect, it } from 'vitest';
import type { BusinessInsightEngineInput } from './contracts';
import { generateBusinessInsights } from './engine';
import {
  createFunnelDropWatcher,
  createInventoryRiskWatcher,
  createPricingRiskWatcher,
  createTrendAnomalyWatcher,
  createWorkflowRiskWatcher,
} from './watchers';

const BASE_INPUT: BusinessInsightEngineInput = {
  generatedAt: '2026-02-25T00:00:00.000Z',
  metricSeries: [],
  funnels: [],
  inventoryIndicators: [],
  workflowIndicators: [],
};

describe('business insight watchers', () => {
  it('detects trend anomalies from metric series', () => {
    const watcher = createTrendAnomalyWatcher({
      minPoints: 5,
      zScoreThreshold: 1.6,
      minRelativeDelta: 0.2,
    });

    const candidates = watcher.run({
      ...BASE_INPUT,
      metricSeries: [
        {
          schemaId: 'sales',
          metricKey: 'dailyRevenue',
          points: [
            { timestamp: '2026-02-20T00:00:00.000Z', value: 100 },
            { timestamp: '2026-02-21T00:00:00.000Z', value: 101 },
            { timestamp: '2026-02-22T00:00:00.000Z', value: 99 },
            { timestamp: '2026-02-23T00:00:00.000Z', value: 102 },
            { timestamp: '2026-02-24T00:00:00.000Z', value: 168 },
          ],
        },
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('trend-anomaly');
    expect(candidates[0]?.fingerprint).toContain('sales:dailyRevenue:upward');
    expect(candidates[0]?.sourceRefs[0]?.metricKey).toBe('dailyRevenue');
  });

  it('detects funnel drop points between adjacent steps', () => {
    const watcher = createFunnelDropWatcher({ minDropRate: 0.2 });

    const candidates = watcher.run({
      ...BASE_INPUT,
      funnels: [
        {
          funnelId: 'checkout',
          schemaId: 'orders',
          steps: [
            { stepId: 'view', label: 'Product View', conversions: 1200 },
            { stepId: 'cart', label: 'Add To Cart', conversions: 800 },
            { stepId: 'pay', label: 'Payment', conversions: 180 },
          ],
        },
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('funnel-dropoff');
    expect(candidates[0]?.metrics.dropRate).toBeCloseTo(0.775);
    expect(candidates[0]?.sourceRefs).toHaveLength(2);
  });

  it('detects inventory stockout risk', () => {
    const watcher = createInventoryRiskWatcher({ reorderWindowDays: 10 });

    const candidates = watcher.run({
      ...BASE_INPUT,
      inventoryIndicators: [
        {
          schemaId: 'product',
          skuId: 'sku-1',
          productName: 'Organic Rice',
          currentStock: 4,
          reorderLevel: 12,
          avgDailyUnitsSold: 3,
          table: 'products',
        },
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('inventory-risk');
    expect(candidates[0]?.summary).toContain('Projected stockout');
    expect(candidates[0]?.metrics.daysUntilStockout).toBeCloseTo(1.333, 3);
  });

  it('detects low or negative pricing margins', () => {
    const watcher = createPricingRiskWatcher({ minMargin: 0.2 });

    const candidates = watcher.run({
      ...BASE_INPUT,
      inventoryIndicators: [
        {
          schemaId: 'product',
          skuId: 'sku-2',
          productName: 'Cooking Oil',
          currentStock: 40,
          reorderLevel: 15,
          avgDailyUnitsSold: 2,
          unitCost: 95,
          unitPrice: 100,
        },
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('pricing-risk');
    expect(candidates[0]?.metrics.marginRate).toBeCloseTo(0.05);
  });

  it('detects workflow degradation from failure and duration regressions', () => {
    const watcher = createWorkflowRiskWatcher({
      minFailureRate: 0.08,
      minFailureDelta: 0.03,
      durationRegressionRatio: 1.5,
      backlogThreshold: 50,
    });

    const candidates = watcher.run({
      ...BASE_INPUT,
      workflowIndicators: [
        {
          schemaId: 'orders',
          workflowId: 'fulfillment.sync',
          failureRate: 0.18,
          baselineFailureRate: 0.05,
          avgDurationMs: 12000,
          baselineDurationMs: 6000,
          backlogCount: 120,
          table: 'workflowEvents',
        },
      ],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('workflow-risk');
    expect(candidates[0]?.metrics.failureDelta).toBeCloseTo(0.13);
    expect(candidates[0]?.metrics.durationRatio).toBeCloseTo(2);
  });
});

describe('generateBusinessInsights', () => {
  it('returns deterministic ranked insight docs with confidence/impact/source metadata', () => {
    const input: BusinessInsightEngineInput = {
      ...BASE_INPUT,
      metricSeries: [
        {
          schemaId: 'sales',
          metricKey: 'dailyRevenue',
          points: [
            { timestamp: '2026-02-20T00:00:00.000Z', value: 100 },
            { timestamp: '2026-02-21T00:00:00.000Z', value: 101 },
            { timestamp: '2026-02-22T00:00:00.000Z', value: 99 },
            { timestamp: '2026-02-23T00:00:00.000Z', value: 102 },
            { timestamp: '2026-02-24T00:00:00.000Z', value: 168 },
          ],
        },
      ],
      funnels: [
        {
          funnelId: 'checkout',
          schemaId: 'orders',
          steps: [
            { stepId: 'view', label: 'Product View', conversions: 1200 },
            { stepId: 'cart', label: 'Add To Cart', conversions: 800 },
            { stepId: 'pay', label: 'Payment', conversions: 180 },
          ],
        },
      ],
      inventoryIndicators: [
        {
          schemaId: 'product',
          skuId: 'sku-1',
          productName: 'Organic Rice',
          currentStock: 4,
          reorderLevel: 12,
          avgDailyUnitsSold: 3,
          unitCost: 52,
          unitPrice: 60,
        },
        {
          schemaId: 'product',
          skuId: 'sku-2',
          productName: 'Cooking Oil',
          currentStock: 40,
          reorderLevel: 15,
          avgDailyUnitsSold: 2,
          unitCost: 95,
          unitPrice: 100,
        },
      ],
      workflowIndicators: [
        {
          schemaId: 'orders',
          workflowId: 'fulfillment.sync',
          failureRate: 0.18,
          baselineFailureRate: 0.05,
          avgDurationMs: 12000,
          baselineDurationMs: 6000,
          backlogCount: 120,
        },
      ],
    };

    const first = generateBusinessInsights(input);
    const second = generateBusinessInsights(input);

    expect(first).toEqual(second);
    expect(first.totalCandidates).toBeGreaterThanOrEqual(first.insights.length);
    expect(first.insights.length).toBeGreaterThan(0);
    expect(
      first.insights.every((insight) => insight.sourceRefs.length > 0),
    ).toBe(true);
    expect(
      first.insights.every(
        (insight) =>
          insight.priorityScore >= 0 &&
          insight.priorityScore <= 1 &&
          insight.confidenceLevel.length > 0 &&
          insight.impactLevel.length > 0,
      ),
    ).toBe(true);

    const ranked = [...first.insights];
    const scores = ranked.map((insight) => insight.priorityScore);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedScores);
  });
});
