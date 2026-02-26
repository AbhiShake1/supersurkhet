export type LocationDwellStatus = 'stable' | 'unstable' | 'unavailable';
export type LocationExecutionMode = 'full' | 'partial' | 'blocked';

export type LocationDwellFailureReason =
  | 'missing-target'
  | 'no-samples'
  | 'stale-samples'
  | 'insufficient-samples'
  | 'insufficient-dwell-span'
  | 'outside-target-radius'
  | 'excessive-drift'
  | 'confidence-below-threshold';

export type LocationDwellPartialTrigger =
  | 'unstable-location'
  | 'unavailable-location';

export type LocationDwellPrecisionMode = 'balanced' | 'precision';

export interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

export type LocationCoordinateLike =
  | LocationCoordinate
  | { lat: number; lng: number }
  | { lat: number; lon: number }
  | [number, number];

export interface LocationSampleLike {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  lon?: number;
  timestampMs?: number;
  capturedAtMs?: number;
  recordedAtMs?: number;
  atMs?: number;
  accuracyMeters?: number | null;
  accuracy?: number | null;
  source?: string;
}

export interface NormalizedLocationSample {
  latitude: number;
  longitude: number;
  timestampMs: number;
  accuracyMeters: number | null;
  source?: string;
}

export interface LocationDwellPolicyInput {
  required?: boolean;
  mode?: 'required' | 'optional' | 'disabled' | 'balanced' | 'precision';
  sampleWindowMs?: number;
  maxSampleAgeMs?: number;
  minSamples?: number;
  minSampleCount?: number;
  minDwellMs?: number;
  targetRadiusMeters?: number;
  radiusMeters?: number;
  maxDriftMeters?: number;
  confidenceThreshold?: number;
  minConfidence?: number;
  baselineAccuracyMeters?: number;
  maxHorizontalAccuracyMeters?: number;
  precisionMode?: LocationDwellPrecisionMode | boolean;
  precisionWeight?: number;
  precisionAccuracyMeters?: number;
  allowPartialWhenUnstable?: boolean;
  allowPartialWhenUnavailable?: boolean;
  allowPartialExecution?: boolean;
  partialExecution?: {
    unstable?: boolean;
    unavailable?: boolean;
  };
  target?: LocationCoordinateLike | null;
  center?: LocationCoordinateLike | null;
  coordinates?: LocationCoordinateLike | null;
}

export interface LocationDwellResolvedPolicy {
  required: boolean;
  sampleWindowMs: number;
  maxSampleAgeMs: number;
  minSamples: number;
  minDwellMs: number;
  targetRadiusMeters: number;
  maxDriftMeters: number;
  confidenceThreshold: number;
  baselineAccuracyMeters: number;
  precisionMode: LocationDwellPrecisionMode;
  precisionWeight: number;
  precisionAccuracyMeters: number;
  allowPartialWhenUnstable: boolean;
  allowPartialWhenUnavailable: boolean;
  target: LocationCoordinate | null;
  source: {
    hasEnginePolicy: boolean;
    hasRuntimeOverrides: boolean;
  };
}

export interface LocationDwellEngineDefinition {
  engineId?: string;
  locationPolicy?: LocationDwellPolicyInput | null;
}

export interface LocationDwellInput {
  samples: readonly LocationSampleLike[];
  engineDefinition?: LocationDwellEngineDefinition | null;
  policyOverrides?: LocationDwellPolicyInput | null;
  evaluatedAtMs?: number;
}

export interface LocationDwellWindowSummary {
  totalSamples: number;
  invalidSamples: number;
  validSamples: number;
  windowSamples: number;
  staleSamples: number;
  consideredSamples: number;
  windowStartMs: number;
  evaluatedAtMs: number;
  oldestTimestampMs: number | null;
  newestTimestampMs: number | null;
  dwellSpanMs: number;
  meanDistanceMeters: number | null;
  maxDistanceMeters: number | null;
  driftMeters: number | null;
  meanAccuracyMeters: number | null;
}

export interface LocationDwellConfidenceComponents {
  distanceScore: number;
  driftScore: number;
  accuracyScore: number;
  geoBaseline: number;
  precisionScore: number;
  baseConfidence: number;
  finalConfidence: number;
}

export interface LocationDwellDecision {
  status: LocationDwellStatus;
  executionMode: LocationExecutionMode;
  shouldProceed: boolean;
  stable: boolean;
  confidence: number;
  threshold: number;
  reasons: readonly LocationDwellFailureReason[];
  partialTriggers: readonly LocationDwellPartialTrigger[];
  policy: LocationDwellResolvedPolicy;
  summary: LocationDwellWindowSummary;
  confidenceComponents: LocationDwellConfidenceComponents;
  evaluatedAtMs: number;
}

export interface LocationDwellRuntimeDecision extends LocationDwellDecision {
  reason: LocationDwellFailureReason | 'stable';
}

const EARTH_RADIUS_METERS = 6_371_000;

const GEO_DISTANCE_WEIGHT = 0.65;
const GEO_ACCURACY_WEIGHT = 0.35;
const BASE_GEO_WEIGHT = 0.75;
const BASE_DRIFT_WEIGHT = 0.25;

export const LOCATION_DWELL_CONFIDENCE_WEIGHTS = {
  geoDistanceWeight: GEO_DISTANCE_WEIGHT,
  geoAccuracyWeight: GEO_ACCURACY_WEIGHT,
  baseGeoWeight: BASE_GEO_WEIGHT,
  baseDriftWeight: BASE_DRIFT_WEIGHT,
} as const;

export const LOCATION_DWELL_FAILURE_REASONS = [
  'missing-target',
  'no-samples',
  'stale-samples',
  'insufficient-samples',
  'insufficient-dwell-span',
  'outside-target-radius',
  'excessive-drift',
  'confidence-below-threshold',
] as const;

export const LOCATION_DWELL_PARTIAL_TRIGGERS = [
  'unstable-location',
  'unavailable-location',
] as const;

export const LOCATION_DWELL_PLATFORM_LIMITATIONS = [
  'Location confidence depends on OS permission grants and sensor availability.',
  'Indoor multipath and coarse providers can inflate reported accuracy and drift.',
  'Backgrounded web/native views may throttle sampling cadence.',
] as const;

export const LOCATION_DWELL_CONFIDENCE_FORMULA =
  'base = (0.75 * ((0.65 * distanceScore) + (0.35 * accuracyScore))) + (0.25 * driftScore); precision = ((1 - precisionWeight) * base) + (precisionWeight * precisionScore)';

export const DEFAULT_LOCATION_DWELL_POLICY: LocationDwellResolvedPolicy = {
  required: true,
  sampleWindowMs: 12_000,
  maxSampleAgeMs: 5_000,
  minSamples: 3,
  minDwellMs: 4_000,
  targetRadiusMeters: 75,
  maxDriftMeters: 45,
  confidenceThreshold: 0.7,
  baselineAccuracyMeters: 50,
  precisionMode: 'balanced',
  precisionWeight: 0.2,
  precisionAccuracyMeters: 25,
  allowPartialWhenUnstable: true,
  allowPartialWhenUnavailable: true,
  target: null,
  source: {
    hasEnginePolicy: false,
    hasRuntimeOverrides: false,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pickFiniteNumber(
  ...values: Array<number | undefined | null>
): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function pickBoolean(
  ...values: Array<boolean | undefined>
): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return undefined;
}

function parseModeRequired(
  mode: LocationDwellPolicyInput['mode'] | undefined,
): boolean | undefined {
  if (mode === 'required') {
    return true;
  }

  if (mode === 'optional' || mode === 'disabled') {
    return false;
  }

  if (mode === 'balanced' || mode === 'precision') {
    return true;
  }

  return undefined;
}

function parseModePrecision(
  mode: LocationDwellPolicyInput['mode'] | undefined,
): LocationDwellPrecisionMode | undefined {
  if (mode === 'precision') {
    return 'precision';
  }

  if (mode === 'balanced' || mode === 'disabled') {
    return 'balanced';
  }

  return undefined;
}

function resolveNumber(
  fallback: number,
  minValue: number,
  maxValue: number,
  ...values: Array<number | undefined | null>
): number {
  const value = pickFiniteNumber(...values);
  if (value === null) {
    return fallback;
  }

  if (value < minValue) {
    return minValue;
  }

  if (value > maxValue) {
    return maxValue;
  }

  return value;
}

function resolvePrecisionMode(
  ...values: Array<LocationDwellPolicyInput['precisionMode']>
): LocationDwellPrecisionMode {
  for (const value of values) {
    if (value === 'precision') {
      return 'precision';
    }

    if (value === true) {
      return 'precision';
    }

    if (value === 'balanced' || value === false) {
      return 'balanced';
    }
  }

  return DEFAULT_LOCATION_DWELL_POLICY.precisionMode;
}

function normalizeCoordinateValue(value: unknown): LocationCoordinate | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length !== 2) {
      return null;
    }

    const latitude = pickFiniteNumber(value[0]);
    const longitude = pickFiniteNumber(value[1]);

    if (latitude === null || longitude === null) {
      return null;
    }

    return normalizeCoordinateValue({ latitude, longitude });
  }

  if (typeof value !== 'object') {
    return null;
  }

  const coordinate = value as Record<string, unknown>;
  const latitude = pickFiniteNumber(
    coordinate.latitude as number,
    coordinate.lat as number,
  );
  const longitude = pickFiniteNumber(
    coordinate.longitude as number,
    coordinate.lng as number,
    coordinate.lon as number,
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function haversineDistanceMeters(
  from: LocationCoordinate,
  to: LocationCoordinate,
): number {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function normalizeLocationSample(
  sample: LocationSampleLike,
): NormalizedLocationSample | null {
  const coordinate = normalizeCoordinateValue(sample);
  if (!coordinate) {
    return null;
  }

  const timestampMs = pickFiniteNumber(
    sample.timestampMs,
    sample.capturedAtMs,
    sample.recordedAtMs,
    sample.atMs,
  );

  if (timestampMs === null) {
    return null;
  }

  const rawAccuracy = pickFiniteNumber(sample.accuracyMeters, sample.accuracy);
  const accuracyMeters = rawAccuracy === null ? null : Math.max(0, rawAccuracy);

  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    timestampMs,
    accuracyMeters,
    source: sample.source,
  };
}

function deriveDeterministicEvaluationTime(
  normalizedSamples: readonly NormalizedLocationSample[],
): number {
  if (normalizedSamples.length === 0) {
    return 0;
  }

  return normalizedSamples.reduce(
    (maxTimestamp, sample) => Math.max(maxTimestamp, sample.timestampMs),
    normalizedSamples[0]?.timestampMs ?? 0,
  );
}

export function resolveLocationDwellPolicy(options?: {
  enginePolicy?: LocationDwellPolicyInput | null;
  policyOverrides?: LocationDwellPolicyInput | null;
}): LocationDwellResolvedPolicy {
  const enginePolicy = options?.enginePolicy ?? undefined;
  const policyOverrides = options?.policyOverrides ?? undefined;

  const required =
    pickBoolean(
      policyOverrides?.required,
      parseModeRequired(policyOverrides?.mode),
      enginePolicy?.required,
      parseModeRequired(enginePolicy?.mode),
    ) ?? DEFAULT_LOCATION_DWELL_POLICY.required;

  const sampleWindowMs = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.sampleWindowMs,
    1_000,
    5 * 60_000,
    policyOverrides?.sampleWindowMs,
    enginePolicy?.sampleWindowMs,
  );

  const maxSampleAgeMs = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.maxSampleAgeMs,
    1_000,
    10 * 60_000,
    policyOverrides?.maxSampleAgeMs,
    enginePolicy?.maxSampleAgeMs,
  );

  const minSamples = Math.round(
    resolveNumber(
      DEFAULT_LOCATION_DWELL_POLICY.minSamples,
      1,
      20,
      policyOverrides?.minSamples,
      policyOverrides?.minSampleCount,
      enginePolicy?.minSamples,
      enginePolicy?.minSampleCount,
    ),
  );

  const minDwellMs = Math.round(
    resolveNumber(
      DEFAULT_LOCATION_DWELL_POLICY.minDwellMs,
      0,
      5 * 60_000,
      policyOverrides?.minDwellMs,
      enginePolicy?.minDwellMs,
    ),
  );

  const targetRadiusMeters = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.targetRadiusMeters,
    5,
    10_000,
    policyOverrides?.targetRadiusMeters,
    policyOverrides?.radiusMeters,
    enginePolicy?.targetRadiusMeters,
    enginePolicy?.radiusMeters,
  );

  const maxDriftMeters = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.maxDriftMeters,
    1,
    10_000,
    policyOverrides?.maxDriftMeters,
    enginePolicy?.maxDriftMeters,
  );

  const confidenceThreshold = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.confidenceThreshold,
    0,
    1,
    policyOverrides?.confidenceThreshold,
    policyOverrides?.minConfidence,
    enginePolicy?.confidenceThreshold,
    enginePolicy?.minConfidence,
  );

  const baselineAccuracyMeters = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.baselineAccuracyMeters,
    1,
    10_000,
    policyOverrides?.baselineAccuracyMeters,
    policyOverrides?.maxHorizontalAccuracyMeters,
    enginePolicy?.baselineAccuracyMeters,
    enginePolicy?.maxHorizontalAccuracyMeters,
  );

  const precisionMode = resolvePrecisionMode(
    policyOverrides?.precisionMode,
    parseModePrecision(policyOverrides?.mode),
    enginePolicy?.precisionMode,
    parseModePrecision(enginePolicy?.mode),
  );

  const precisionWeight = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.precisionWeight,
    0,
    1,
    policyOverrides?.precisionWeight,
    enginePolicy?.precisionWeight,
  );

  const precisionAccuracyMeters = resolveNumber(
    DEFAULT_LOCATION_DWELL_POLICY.precisionAccuracyMeters,
    1,
    10_000,
    policyOverrides?.precisionAccuracyMeters,
    enginePolicy?.precisionAccuracyMeters,
  );

  const allowPartialWhenUnstable =
    pickBoolean(
      policyOverrides?.allowPartialWhenUnstable,
      policyOverrides?.partialExecution?.unstable,
      policyOverrides?.allowPartialExecution,
      enginePolicy?.allowPartialWhenUnstable,
      enginePolicy?.partialExecution?.unstable,
      enginePolicy?.allowPartialExecution,
    ) ?? DEFAULT_LOCATION_DWELL_POLICY.allowPartialWhenUnstable;

  const allowPartialWhenUnavailable =
    pickBoolean(
      policyOverrides?.allowPartialWhenUnavailable,
      policyOverrides?.partialExecution?.unavailable,
      policyOverrides?.allowPartialExecution,
      enginePolicy?.allowPartialWhenUnavailable,
      enginePolicy?.partialExecution?.unavailable,
      enginePolicy?.allowPartialExecution,
    ) ?? DEFAULT_LOCATION_DWELL_POLICY.allowPartialWhenUnavailable;

  const target =
    normalizeCoordinateValue(policyOverrides?.target) ??
    normalizeCoordinateValue(policyOverrides?.center) ??
    normalizeCoordinateValue(policyOverrides?.coordinates) ??
    normalizeCoordinateValue(enginePolicy?.target) ??
    normalizeCoordinateValue(enginePolicy?.center) ??
    normalizeCoordinateValue(enginePolicy?.coordinates) ??
    DEFAULT_LOCATION_DWELL_POLICY.target;

  return {
    required,
    sampleWindowMs,
    maxSampleAgeMs,
    minSamples,
    minDwellMs,
    targetRadiusMeters,
    maxDriftMeters,
    confidenceThreshold,
    baselineAccuracyMeters,
    precisionMode,
    precisionWeight,
    precisionAccuracyMeters,
    allowPartialWhenUnstable,
    allowPartialWhenUnavailable,
    target,
    source: {
      hasEnginePolicy: Boolean(enginePolicy),
      hasRuntimeOverrides: Boolean(policyOverrides),
    },
  };
}

export function aggregateLocationSamplesForDwell(input: {
  samples: readonly LocationSampleLike[];
  evaluatedAtMs: number;
  policy: Pick<
    LocationDwellResolvedPolicy,
    'sampleWindowMs' | 'maxSampleAgeMs' | 'target'
  >;
}): {
  normalizedSamples: NormalizedLocationSample[];
  consideredSamples: NormalizedLocationSample[];
  summary: LocationDwellWindowSummary;
} {
  const normalizedSamples = input.samples
    .map((sample) => normalizeLocationSample(sample))
    .filter((sample): sample is NormalizedLocationSample => sample !== null)
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const windowStartMs = input.evaluatedAtMs - input.policy.sampleWindowMs;
  const windowSamples = normalizedSamples.filter(
    (sample) =>
      sample.timestampMs >= windowStartMs &&
      sample.timestampMs <= input.evaluatedAtMs,
  );

  const consideredSamples = windowSamples.filter(
    (sample) =>
      input.evaluatedAtMs - sample.timestampMs <= input.policy.maxSampleAgeMs,
  );

  const staleSamples = windowSamples.length - consideredSamples.length;

  const oldestTimestampMs =
    consideredSamples.length > 0
      ? (consideredSamples[0]?.timestampMs ?? null)
      : null;

  const newestTimestampMs =
    consideredSamples.length > 0
      ? (consideredSamples[consideredSamples.length - 1]?.timestampMs ?? null)
      : null;

  const dwellSpanMs =
    oldestTimestampMs === null || newestTimestampMs === null
      ? 0
      : Math.max(0, newestTimestampMs - oldestTimestampMs);

  const accuracyValues = consideredSamples
    .map((sample) => sample.accuracyMeters)
    .filter((value): value is number => value !== null);

  const meanAccuracyMeters = average(accuracyValues);

  let meanDistanceMeters: number | null = null;
  let maxDistanceMeters: number | null = null;

  if (input.policy.target) {
    const targetDistances = consideredSamples.map((sample) =>
      haversineDistanceMeters(
        sample,
        input.policy.target as LocationCoordinate,
      ),
    );

    meanDistanceMeters = average(targetDistances);
    maxDistanceMeters =
      targetDistances.length > 0 ? Math.max(...targetDistances) : null;
  }

  let driftMeters: number | null = null;
  if (consideredSamples.length > 0) {
    const centroid = {
      latitude:
        consideredSamples.reduce((sum, sample) => sum + sample.latitude, 0) /
        consideredSamples.length,
      longitude:
        consideredSamples.reduce((sum, sample) => sum + sample.longitude, 0) /
        consideredSamples.length,
    };

    const centroidDistances = consideredSamples.map((sample) =>
      haversineDistanceMeters(sample, centroid),
    );
    driftMeters =
      centroidDistances.length > 0 ? Math.max(...centroidDistances) : 0;
  }

  const summary: LocationDwellWindowSummary = {
    totalSamples: input.samples.length,
    invalidSamples: input.samples.length - normalizedSamples.length,
    validSamples: normalizedSamples.length,
    windowSamples: windowSamples.length,
    staleSamples,
    consideredSamples: consideredSamples.length,
    windowStartMs,
    evaluatedAtMs: input.evaluatedAtMs,
    oldestTimestampMs,
    newestTimestampMs,
    dwellSpanMs,
    meanDistanceMeters:
      meanDistanceMeters === null ? null : round(meanDistanceMeters, 3),
    maxDistanceMeters:
      maxDistanceMeters === null ? null : round(maxDistanceMeters, 3),
    driftMeters: driftMeters === null ? null : round(driftMeters, 3),
    meanAccuracyMeters:
      meanAccuracyMeters === null ? null : round(meanAccuracyMeters, 3),
  };

  return {
    normalizedSamples,
    consideredSamples,
    summary,
  };
}

function buildConfidence(
  summary: Pick<
    LocationDwellWindowSummary,
    'meanDistanceMeters' | 'driftMeters' | 'meanAccuracyMeters'
  >,
  policy: Pick<
    LocationDwellResolvedPolicy,
    | 'target'
    | 'targetRadiusMeters'
    | 'maxDriftMeters'
    | 'baselineAccuracyMeters'
    | 'precisionMode'
    | 'precisionWeight'
    | 'precisionAccuracyMeters'
  >,
): LocationDwellConfidenceComponents {
  const distanceScore = policy.target
    ? clamp01(
        1 -
          (summary.meanDistanceMeters ?? policy.targetRadiusMeters) /
            policy.targetRadiusMeters,
      )
    : 1;

  const driftScore = clamp01(
    1 - (summary.driftMeters ?? policy.maxDriftMeters) / policy.maxDriftMeters,
  );

  const accuracyScore = clamp01(
    1 -
      (summary.meanAccuracyMeters ?? policy.baselineAccuracyMeters) /
        policy.baselineAccuracyMeters,
  );

  const geoBaseline =
    distanceScore * GEO_DISTANCE_WEIGHT + accuracyScore * GEO_ACCURACY_WEIGHT;

  const baseConfidence =
    geoBaseline * BASE_GEO_WEIGHT + driftScore * BASE_DRIFT_WEIGHT;

  const precisionScore = clamp01(
    1 -
      (summary.meanAccuracyMeters ?? policy.precisionAccuracyMeters) /
        policy.precisionAccuracyMeters,
  );

  const finalConfidence =
    policy.precisionMode === 'precision'
      ? (1 - policy.precisionWeight) * baseConfidence +
        policy.precisionWeight * precisionScore
      : baseConfidence;

  return {
    distanceScore: round(distanceScore),
    driftScore: round(driftScore),
    accuracyScore: round(accuracyScore),
    geoBaseline: round(geoBaseline),
    precisionScore: round(precisionScore),
    baseConfidence: round(baseConfidence),
    finalConfidence: round(finalConfidence),
  };
}

export function evaluateLocationDwell(
  input: LocationDwellInput,
): LocationDwellDecision {
  const normalizedSamples = input.samples
    .map((sample) => normalizeLocationSample(sample))
    .filter((sample): sample is NormalizedLocationSample => sample !== null);

  const evaluatedAtMs =
    pickFiniteNumber(input.evaluatedAtMs) ??
    deriveDeterministicEvaluationTime(normalizedSamples);

  const policy = resolveLocationDwellPolicy({
    enginePolicy: input.engineDefinition?.locationPolicy,
    policyOverrides: input.policyOverrides,
  });

  const { summary } = aggregateLocationSamplesForDwell({
    samples: input.samples,
    evaluatedAtMs,
    policy,
  });

  const confidenceComponents = buildConfidence(summary, policy);

  const unavailableReasons: LocationDwellFailureReason[] = [];
  if (policy.target === null) {
    unavailableReasons.push('missing-target');
  }

  if (summary.consideredSamples === 0) {
    unavailableReasons.push(
      summary.windowSamples > 0 ? 'stale-samples' : 'no-samples',
    );
  }

  if (
    summary.consideredSamples > 0 &&
    summary.consideredSamples < policy.minSamples
  ) {
    unavailableReasons.push('insufficient-samples');
  }

  if (
    summary.consideredSamples > 0 &&
    summary.dwellSpanMs < policy.minDwellMs
  ) {
    unavailableReasons.push('insufficient-dwell-span');
  }

  let status: LocationDwellStatus = 'stable';
  let reasons: LocationDwellFailureReason[] = [];

  if (unavailableReasons.length > 0) {
    status = 'unavailable';
    reasons = unavailableReasons;
  } else {
    const unstableReasons: LocationDwellFailureReason[] = [];

    if (
      summary.meanDistanceMeters !== null &&
      summary.meanDistanceMeters > policy.targetRadiusMeters
    ) {
      unstableReasons.push('outside-target-radius');
    }

    if (
      summary.driftMeters !== null &&
      summary.driftMeters > policy.maxDriftMeters
    ) {
      unstableReasons.push('excessive-drift');
    }

    if (confidenceComponents.finalConfidence < policy.confidenceThreshold) {
      unstableReasons.push('confidence-below-threshold');
    }

    if (unstableReasons.length > 0) {
      status = 'unstable';
      reasons = unstableReasons;
    }
  }

  const partialTriggers: LocationDwellPartialTrigger[] = [];

  let executionMode: LocationExecutionMode = 'full';
  if (status !== 'stable' && policy.required) {
    if (status === 'unstable' && policy.allowPartialWhenUnstable) {
      executionMode = 'partial';
      partialTriggers.push('unstable-location');
    } else if (status === 'unavailable' && policy.allowPartialWhenUnavailable) {
      executionMode = 'partial';
      partialTriggers.push('unavailable-location');
    } else {
      executionMode = 'blocked';
    }
  }

  if (!policy.required) {
    executionMode = 'full';
  }

  return {
    status,
    executionMode,
    shouldProceed: executionMode !== 'blocked',
    stable: status === 'stable',
    confidence: confidenceComponents.finalConfidence,
    threshold: policy.confidenceThreshold,
    reasons,
    partialTriggers,
    policy,
    summary,
    confidenceComponents,
    evaluatedAtMs,
  };
}

export function classifyLocationDwell(
  input: LocationDwellInput,
): LocationDwellStatus {
  return evaluateLocationDwell(input).status;
}

function isLocationDwellDecision(
  value: LocationDwellDecision | LocationDwellInput,
): value is LocationDwellDecision {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'executionMode' in value &&
    'summary' in value
  );
}

export function toLocationDwellRuntimeDecision(
  input: LocationDwellDecision | LocationDwellInput,
): LocationDwellRuntimeDecision {
  const decision = isLocationDwellDecision(input)
    ? input
    : evaluateLocationDwell(input);

  return {
    ...decision,
    reason: decision.reasons[0] ?? 'stable',
  };
}
