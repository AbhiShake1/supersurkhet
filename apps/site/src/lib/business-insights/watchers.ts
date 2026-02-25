import {
  type BusinessInsightCandidate,
  type BusinessInsightWatcher,
  clamp01,
  type FunnelMetric,
  type InventoryIndicator,
  type MetricSeries,
  type WorkflowIndicator,
} from './contracts';

export interface TrendAnomalyWatcherOptions {
  minPoints?: number;
  zScoreThreshold?: number;
  minRelativeDelta?: number;
}

export interface FunnelDropWatcherOptions {
  minDropRate?: number;
}

export interface InventoryRiskWatcherOptions {
  reorderWindowDays?: number;
}

export interface PricingRiskWatcherOptions {
  minMargin?: number;
}

export interface WorkflowRiskWatcherOptions {
  minFailureRate?: number;
  minFailureDelta?: number;
  durationRegressionRatio?: number;
  backlogThreshold?: number;
}

export function createTrendAnomalyWatcher(
  options: TrendAnomalyWatcherOptions = {},
): BusinessInsightWatcher {
  const minPoints = Math.max(3, options.minPoints ?? 5);
  const zScoreThreshold = Math.max(0.1, options.zScoreThreshold ?? 1.8);
  const minRelativeDelta = Math.max(0, options.minRelativeDelta ?? 0.15);

  return {
    watcherId: 'trend-anomaly-watcher',
    run(input) {
      return input.metricSeries
        .flatMap((series) =>
          createTrendInsightCandidate(
            series,
            minPoints,
            zScoreThreshold,
            minRelativeDelta,
          ),
        )
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
    },
  };
}

export function createFunnelDropWatcher(
  options: FunnelDropWatcherOptions = {},
): BusinessInsightWatcher {
  const minDropRate = Math.min(
    0.99,
    Math.max(0.05, options.minDropRate ?? 0.22),
  );

  return {
    watcherId: 'funnel-drop-watcher',
    run(input) {
      return input.funnels
        .flatMap((funnel) => createFunnelInsightCandidate(funnel, minDropRate))
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
    },
  };
}

export function createInventoryRiskWatcher(
  options: InventoryRiskWatcherOptions = {},
): BusinessInsightWatcher {
  const reorderWindowDays = Math.max(1, options.reorderWindowDays ?? 10);

  return {
    watcherId: 'inventory-risk-watcher',
    run(input) {
      return input.inventoryIndicators
        .flatMap((indicator) =>
          createInventoryRiskCandidate(indicator, reorderWindowDays),
        )
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
    },
  };
}

export function createPricingRiskWatcher(
  options: PricingRiskWatcherOptions = {},
): BusinessInsightWatcher {
  const minMargin = Math.min(0.95, Math.max(-0.5, options.minMargin ?? 0.18));

  return {
    watcherId: 'pricing-risk-watcher',
    run(input) {
      return input.inventoryIndicators
        .flatMap((indicator) =>
          createPricingRiskCandidate(indicator, minMargin),
        )
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
    },
  };
}

export function createWorkflowRiskWatcher(
  options: WorkflowRiskWatcherOptions = {},
): BusinessInsightWatcher {
  const minFailureRate = Math.min(
    1,
    Math.max(0.01, options.minFailureRate ?? 0.08),
  );
  const minFailureDelta = Math.min(
    1,
    Math.max(0.01, options.minFailureDelta ?? 0.03),
  );
  const durationRegressionRatio = Math.max(
    1.05,
    options.durationRegressionRatio ?? 1.5,
  );
  const backlogThreshold = Math.max(1, options.backlogThreshold ?? 50);

  return {
    watcherId: 'workflow-risk-watcher',
    run(input) {
      return input.workflowIndicators
        .flatMap((indicator) =>
          createWorkflowRiskCandidate(
            indicator,
            minFailureRate,
            minFailureDelta,
            durationRegressionRatio,
            backlogThreshold,
          ),
        )
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        );
    },
  };
}

export function createDefaultBusinessInsightWatchers(): BusinessInsightWatcher[] {
  return [
    createTrendAnomalyWatcher(),
    createFunnelDropWatcher(),
    createInventoryRiskWatcher(),
    createPricingRiskWatcher(),
    createWorkflowRiskWatcher(),
  ];
}

function createTrendInsightCandidate(
  series: MetricSeries,
  minPoints: number,
  zScoreThreshold: number,
  minRelativeDelta: number,
): BusinessInsightCandidate[] {
  if (series.points.length < minPoints) {
    return [];
  }

  const sortedPoints = [...series.points].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
  const latestPoint = sortedPoints[sortedPoints.length - 1];
  if (!latestPoint) {
    return [];
  }

  const baselinePoints = sortedPoints.slice(0, -1);
  const baselineValues = baselinePoints.map((point) => point.value);
  const baselineMean = mean(baselineValues);
  const baselineStdDev = standardDeviation(baselineValues, baselineMean);
  const delta = latestPoint.value - baselineMean;
  const relativeDelta =
    baselineMean === 0
      ? Math.abs(delta)
      : Math.abs(delta) / Math.abs(baselineMean);
  const zScore =
    baselineStdDev === 0
      ? delta === 0
        ? 0
        : Math.sign(delta) * 4
      : delta / baselineStdDev;

  if (Math.abs(zScore) < zScoreThreshold || relativeDelta < minRelativeDelta) {
    return [];
  }

  const trendDirection = delta >= 0 ? 'upward' : 'downward';
  const metricLabel = labelMetric(series.metricKey);
  const impactScore = clamp01(0.3 + Math.min(relativeDelta, 1.5) * 0.45);
  const confidenceScore = clamp01(0.5 + Math.min(Math.abs(zScore), 4) * 0.1);

  return [
    {
      watcherId: 'trend-anomaly-watcher',
      kind: 'trend-anomaly',
      fingerprint: `${series.schemaId}:${series.metricKey}:${trendDirection}`,
      title: `${metricLabel} shows ${trendDirection} anomaly`,
      summary: `Latest ${metricLabel.toLowerCase()} moved ${formatPercent(relativeDelta)} from baseline.`,
      confidenceScore,
      impactScore,
      recommendations: [
        'Review segment-level breakdowns to confirm the source of the change.',
        'Validate whether this shift is seasonal or caused by a recent workflow/config change.',
      ],
      sourceRefs: [
        {
          schemaId: series.schemaId,
          metricKey: series.metricKey,
          table: series.table,
          window: `${baselinePoints.length}-point baseline`,
          value: latestPoint.value,
        },
      ],
      metrics: {
        latestValue: latestPoint.value,
        baselineMean,
        zScore,
        relativeDelta,
      },
    },
  ];
}

function createFunnelInsightCandidate(
  funnel: FunnelMetric,
  minDropRate: number,
): BusinessInsightCandidate[] {
  if (funnel.steps.length < 2) {
    return [];
  }

  let maxDropRate = -1;
  let fromStep: FunnelMetric['steps'][number] | null = null;
  let toStep: FunnelMetric['steps'][number] | null = null;

  for (let index = 0; index < funnel.steps.length - 1; index += 1) {
    const current = funnel.steps[index];
    const next = funnel.steps[index + 1];
    if (!current || !next || current.conversions <= 0) {
      continue;
    }
    const dropRate =
      (current.conversions - next.conversions) / current.conversions;
    if (dropRate > maxDropRate) {
      maxDropRate = dropRate;
      fromStep = current;
      toStep = next;
    }
  }

  if (!fromStep || !toStep || maxDropRate < minDropRate) {
    return [];
  }

  const confidenceScore = clamp01(
    0.5 + Math.min(fromStep.conversions, 2000) / 5000,
  );
  const impactScore = clamp01(0.35 + maxDropRate * 0.6);

  return [
    {
      watcherId: 'funnel-drop-watcher',
      kind: 'funnel-dropoff',
      fingerprint: `${funnel.schemaId}:${funnel.funnelId}:${fromStep.stepId}->${toStep.stepId}`,
      title: `Funnel drop-off at ${fromStep.label} -> ${toStep.label}`,
      summary: `${formatPercent(maxDropRate)} drop between consecutive funnel steps.`,
      confidenceScore,
      impactScore,
      recommendations: [
        'Inspect handoff friction between these two steps.',
        'Run a short experiment on messaging, pricing, or UX at this transition.',
      ],
      sourceRefs: [
        {
          schemaId: funnel.schemaId,
          metricKey: `${funnel.funnelId}.${fromStep.stepId}.conversions`,
          value: fromStep.conversions,
        },
        {
          schemaId: funnel.schemaId,
          metricKey: `${funnel.funnelId}.${toStep.stepId}.conversions`,
          value: toStep.conversions,
        },
      ],
      metrics: {
        fromConversions: fromStep.conversions,
        toConversions: toStep.conversions,
        dropRate: maxDropRate,
      },
    },
  ];
}

function createInventoryRiskCandidate(
  indicator: InventoryIndicator,
  reorderWindowDays: number,
): BusinessInsightCandidate[] {
  const currentStock = Math.max(0, indicator.currentStock);
  const reorderLevel = Math.max(0, indicator.reorderLevel);
  const avgDailyUnitsSold = Math.max(0, indicator.avgDailyUnitsSold);
  const daysUntilStockout =
    indicator.daysUntilStockout ??
    (avgDailyUnitsSold > 0
      ? currentStock / avgDailyUnitsSold
      : Number.POSITIVE_INFINITY);
  const isOutOfStock = currentStock <= 0;
  const shouldWarn =
    isOutOfStock ||
    currentStock <= reorderLevel ||
    daysUntilStockout <= reorderWindowDays;

  if (!shouldWarn) {
    return [];
  }

  const urgencyFactor =
    Number.isFinite(daysUntilStockout) && daysUntilStockout > 0
      ? Math.min(1, reorderWindowDays / daysUntilStockout)
      : 1;
  const confidenceScore = clamp01(0.6 + (avgDailyUnitsSold > 0 ? 0.2 : 0));
  const impactScore = clamp01(isOutOfStock ? 0.95 : 0.5 + urgencyFactor * 0.4);
  const productLabel = indicator.productName ?? indicator.skuId;

  return [
    {
      watcherId: 'inventory-risk-watcher',
      kind: 'inventory-risk',
      fingerprint: `${indicator.schemaId}:${indicator.skuId}`,
      title: isOutOfStock
        ? `${productLabel} is out of stock`
        : `${productLabel} is nearing stockout`,
      summary: isOutOfStock
        ? 'Current stock is zero and needs replenishment immediately.'
        : `Projected stockout in ${formatDays(daysUntilStockout)} at current demand.`,
      confidenceScore,
      impactScore,
      recommendations: [
        'Prioritize restock from top supplier or substitute items.',
        'Adjust reorder threshold if current demand pattern changed.',
      ],
      sourceRefs: [
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.skuId}.currentStock`,
          table: indicator.table,
          rowId: indicator.skuId,
          value: currentStock,
          unit: 'units',
        },
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.skuId}.avgDailyUnitsSold`,
          table: indicator.table,
          rowId: indicator.skuId,
          value: avgDailyUnitsSold,
          unit: 'units/day',
        },
      ],
      metrics: {
        currentStock,
        reorderLevel,
        avgDailyUnitsSold,
        daysUntilStockout: Number.isFinite(daysUntilStockout)
          ? daysUntilStockout
          : reorderWindowDays * 10,
      },
    },
  ];
}

function createPricingRiskCandidate(
  indicator: InventoryIndicator,
  minMargin: number,
): BusinessInsightCandidate[] {
  const unitCost = indicator.unitCost;
  const unitPrice = indicator.unitPrice;
  if (
    typeof unitCost !== 'number' ||
    typeof unitPrice !== 'number' ||
    unitPrice <= 0
  ) {
    return [];
  }

  const marginRate = (unitPrice - unitCost) / unitPrice;
  if (marginRate >= minMargin) {
    return [];
  }

  const isNegativeMargin = marginRate < 0;
  const confidenceScore = 0.85;
  const impactScore = clamp01(
    isNegativeMargin ? 0.95 : 0.45 + (minMargin - marginRate),
  );
  const productLabel = indicator.productName ?? indicator.skuId;

  return [
    {
      watcherId: 'pricing-risk-watcher',
      kind: 'pricing-risk',
      fingerprint: `${indicator.schemaId}:${indicator.skuId}:margin`,
      title: `Low margin on ${productLabel}`,
      summary: `Unit margin ${formatPercent(marginRate)} is below target ${formatPercent(minMargin)}.`,
      confidenceScore,
      impactScore,
      recommendations: [
        'Review unit cost inputs and discounting policies.',
        'Test a price floor or bundle strategy to restore margin.',
      ],
      sourceRefs: [
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.skuId}.unitCost`,
          table: indicator.table,
          rowId: indicator.skuId,
          value: unitCost,
        },
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.skuId}.unitPrice`,
          table: indicator.table,
          rowId: indicator.skuId,
          value: unitPrice,
        },
      ],
      metrics: {
        unitCost,
        unitPrice,
        marginRate,
        marginGap: minMargin - marginRate,
      },
    },
  ];
}

function createWorkflowRiskCandidate(
  indicator: WorkflowIndicator,
  minFailureRate: number,
  minFailureDelta: number,
  durationRegressionRatio: number,
  backlogThreshold: number,
): BusinessInsightCandidate[] {
  const failureRate = clamp01(indicator.failureRate);
  const baselineFailureRate = clamp01(indicator.baselineFailureRate ?? 0);
  const failureDelta = failureRate - baselineFailureRate;
  const avgDurationMs = indicator.avgDurationMs ?? 0;
  const baselineDurationMs = indicator.baselineDurationMs ?? 0;
  const durationRatio =
    baselineDurationMs > 0 && avgDurationMs > 0
      ? avgDurationMs / baselineDurationMs
      : 1;
  const backlogCount = indicator.backlogCount ?? 0;
  const failureRegressed =
    failureRate >= minFailureRate &&
    (baselineFailureRate === 0 || failureDelta >= minFailureDelta);
  const durationRegressed = durationRatio >= durationRegressionRatio;
  const backlogPressure =
    backlogCount >= backlogThreshold && failureRate >= minFailureRate;

  if (!failureRegressed && !durationRegressed && !backlogPressure) {
    return [];
  }

  const confidenceScore = clamp01(
    0.5 +
      (failureRegressed ? 0.2 : 0) +
      (durationRegressed ? 0.15 : 0) +
      (backlogPressure ? 0.1 : 0),
  );
  const impactScore = clamp01(
    0.4 +
      Math.max(
        failureRate,
        durationRegressed ? Math.min(durationRatio / 2, 1) : 0,
        backlogPressure ? Math.min(backlogCount / 200, 1) : 0,
      ) *
        0.55,
  );

  return [
    {
      watcherId: 'workflow-risk-watcher',
      kind: 'workflow-risk',
      fingerprint: `${indicator.schemaId}:${indicator.workflowId}`,
      title: `Workflow ${indicator.workflowId} is degrading`,
      summary:
        'Failure rate or processing latency regressed against baseline trend.',
      confidenceScore,
      impactScore,
      recommendations: [
        'Inspect recent workflow/action changes and retry behavior.',
        'Drain queued jobs and add guardrails for failing branches.',
      ],
      sourceRefs: [
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.workflowId}.failureRate`,
          table: indicator.table,
          value: failureRate,
          unit: 'ratio',
        },
        {
          schemaId: indicator.schemaId,
          metricKey: `${indicator.workflowId}.avgDurationMs`,
          table: indicator.table,
          value: avgDurationMs,
          unit: 'ms',
        },
      ],
      metrics: {
        failureRate,
        baselineFailureRate,
        failureDelta,
        avgDurationMs,
        baselineDurationMs,
        durationRatio,
        backlogCount,
      },
    },
  ];
}

function mean(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], avg: number) {
  if (values.length <= 1) {
    return 0;
  }
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function labelMetric(metricKey: string) {
  const label = metricKey
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ');
  if (label.length === 0) {
    return 'Metric';
  }
  return `${label[0]?.toUpperCase() ?? ''}${label.slice(1)}`;
}

function formatPercent(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  return `${(normalizedValue * 100).toFixed(1)}%`;
}

function formatDays(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toFixed(1);
}
