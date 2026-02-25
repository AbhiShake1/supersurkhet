export type BusinessInsightKind =
  | 'trend-anomaly'
  | 'funnel-dropoff'
  | 'inventory-risk'
  | 'pricing-risk'
  | 'workflow-risk';

export type BusinessInsightLevel = 'low' | 'medium' | 'high';

export interface BusinessInsightSourceRef {
  schemaId: string;
  metricKey: string;
  table?: string;
  rowId?: string;
  window?: string;
  value?: number;
  unit?: string;
}

export interface BusinessInsightDoc {
  insightId: string;
  watcherId: string;
  kind: BusinessInsightKind;
  title: string;
  summary: string;
  confidenceScore: number;
  confidenceLevel: BusinessInsightLevel;
  impactScore: number;
  impactLevel: BusinessInsightLevel;
  priorityScore: number;
  recommendations: string[];
  sourceRefs: BusinessInsightSourceRef[];
  metrics: Record<string, number>;
  detectedAt: string;
}

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  schemaId: string;
  metricKey: string;
  table?: string;
  points: readonly MetricPoint[];
}

export interface FunnelStepMetric {
  stepId: string;
  label: string;
  conversions: number;
}

export interface FunnelMetric {
  funnelId: string;
  schemaId: string;
  steps: readonly FunnelStepMetric[];
}

export interface InventoryIndicator {
  schemaId: string;
  skuId: string;
  productName?: string;
  table?: string;
  currentStock: number;
  reorderLevel: number;
  avgDailyUnitsSold: number;
  daysUntilStockout?: number;
  unitCost?: number;
  unitPrice?: number;
}

export interface WorkflowIndicator {
  schemaId: string;
  workflowId: string;
  table?: string;
  failureRate: number;
  baselineFailureRate?: number;
  avgDurationMs?: number;
  baselineDurationMs?: number;
  backlogCount?: number;
}

export interface BusinessInsightEngineInput {
  generatedAt: string;
  metricSeries: readonly MetricSeries[];
  funnels: readonly FunnelMetric[];
  inventoryIndicators: readonly InventoryIndicator[];
  workflowIndicators: readonly WorkflowIndicator[];
}

export interface BusinessInsightCandidate {
  watcherId: string;
  kind: BusinessInsightKind;
  fingerprint: string;
  title: string;
  summary: string;
  confidenceScore: number;
  impactScore: number;
  recommendations: string[];
  sourceRefs: BusinessInsightSourceRef[];
  metrics: Record<string, number>;
}

export interface BusinessInsightWatcher {
  watcherId: string;
  run(input: BusinessInsightEngineInput): BusinessInsightCandidate[];
}

export interface BusinessInsightEngineResult {
  generatedAt: string;
  totalCandidates: number;
  insights: BusinessInsightDoc[];
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function levelFromScore(score: number): BusinessInsightLevel {
  if (score >= 0.75) {
    return 'high';
  }
  if (score >= 0.45) {
    return 'medium';
  }
  return 'low';
}

export function insightIdFromFingerprint(
  watcherId: string,
  fingerprint: string,
) {
  return `${watcherId}:${fingerprint}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9:_-]/g, '-');
}
