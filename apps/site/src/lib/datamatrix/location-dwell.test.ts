import { describe, expect, it } from 'vitest';

import {
  classifyLocationDwell,
  DEFAULT_LOCATION_DWELL_POLICY,
  evaluateLocationDwell,
  LOCATION_DWELL_CONFIDENCE_FORMULA,
  LOCATION_DWELL_PLATFORM_LIMITATIONS,
  type LocationCoordinate,
  type LocationSampleLike,
  resolveLocationDwellPolicy,
  toLocationDwellRuntimeDecision,
} from './location-dwell';

const BASE_TARGET: LocationCoordinate = {
  latitude: 27.7172,
  longitude: 85.324,
};

const BASE_TIME = 1_710_000_000_000;

function sample(
  latitudeOffset: number,
  longitudeOffset: number,
  index: number,
  accuracyMeters: number,
): LocationSampleLike {
  return {
    latitude: BASE_TARGET.latitude + latitudeOffset,
    longitude: BASE_TARGET.longitude + longitudeOffset,
    timestampMs: BASE_TIME - index * 2_000,
    accuracyMeters,
  };
}

describe('resolveLocationDwellPolicy', () => {
  it('applies runtime overrides over engine policy defaults', () => {
    const policy = resolveLocationDwellPolicy({
      enginePolicy: {
        minSamples: 5,
        targetRadiusMeters: 45,
        partialExecution: {
          unstable: false,
        },
      },
      policyOverrides: {
        minSamples: 3,
        allowPartialWhenUnstable: true,
      },
    });

    expect(policy.minSamples).toBe(3);
    expect(policy.targetRadiusMeters).toBe(45);
    expect(policy.allowPartialWhenUnstable).toBe(true);
    expect(policy.source.hasEnginePolicy).toBe(true);
    expect(policy.source.hasRuntimeOverrides).toBe(true);
  });

  it('exports a stable confidence formula contract', () => {
    expect(LOCATION_DWELL_CONFIDENCE_FORMULA).toContain('distanceScore');
    expect(DEFAULT_LOCATION_DWELL_POLICY.confidenceThreshold).toBe(0.7);
    expect(LOCATION_DWELL_PLATFORM_LIMITATIONS.length).toBeGreaterThan(0);
  });

  it('accepts v2 policy aliases from plan 081 contracts', () => {
    const policy = resolveLocationDwellPolicy({
      enginePolicy: {
        mode: 'precision',
        minSampleCount: 4,
        minDwellMs: 8_000,
        maxHorizontalAccuracyMeters: 30,
        minConfidence: 0.84,
        allowPartialExecution: false,
      },
      policyOverrides: {
        mode: 'disabled',
        allowPartialExecution: true,
      },
    });

    expect(policy.required).toBe(false);
    expect(policy.precisionMode).toBe('balanced');
    expect(policy.minSamples).toBe(4);
    expect(policy.minDwellMs).toBe(8_000);
    expect(policy.baselineAccuracyMeters).toBe(30);
    expect(policy.confidenceThreshold).toBe(0.84);
    expect(policy.allowPartialWhenUnstable).toBe(true);
    expect(policy.allowPartialWhenUnavailable).toBe(true);
  });
});

describe('evaluateLocationDwell', () => {
  it('classifies stable traces inside radius with sufficient dwell samples', () => {
    const samples: LocationSampleLike[] = [
      sample(0.00001, 0.00001, 0, 9),
      sample(0.00002, 0.00001, 1, 11),
      sample(0.00001, -0.00001, 2, 8),
      sample(0.00002, -0.00002, 3, 10),
    ];

    const decision = evaluateLocationDwell({
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
        },
      },
    });

    expect(decision.status).toBe('stable');
    expect(decision.executionMode).toBe('full');
    expect(decision.shouldProceed).toBe(true);
    expect(decision.reasons).toEqual([]);
    expect(decision.confidence).toBeGreaterThanOrEqual(decision.threshold);
  });

  it('returns unstable + partial when outside target radius and partial is allowed', () => {
    const samples: LocationSampleLike[] = [
      sample(0.0021, 0.0018, 0, 12),
      sample(0.002, 0.0017, 1, 13),
      sample(0.0019, 0.0018, 2, 11),
    ];

    const decision = evaluateLocationDwell({
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          targetRadiusMeters: 80,
          allowPartialWhenUnstable: true,
          allowPartialWhenUnavailable: false,
        },
      },
    });

    expect(decision.status).toBe('unstable');
    expect(decision.executionMode).toBe('partial');
    expect(decision.shouldProceed).toBe(true);
    expect(decision.partialTriggers).toEqual(['unstable-location']);
    expect(decision.reasons).toContain('outside-target-radius');
  });

  it('returns unavailable + partial when dwell cannot be confirmed but fallback is enabled', () => {
    const samples: LocationSampleLike[] = [sample(0.00001, 0.00001, 0, 8)];

    const decision = evaluateLocationDwell({
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          minSamples: 3,
          allowPartialWhenUnavailable: true,
          allowPartialWhenUnstable: false,
        },
      },
    });

    expect(decision.status).toBe('unavailable');
    expect(decision.executionMode).toBe('partial');
    expect(decision.partialTriggers).toEqual(['unavailable-location']);
    expect(decision.reasons).toContain('insufficient-samples');
  });

  it('returns unavailable when dwell span is below policy minimum', () => {
    const samples: LocationSampleLike[] = [
      sample(0.00001, 0.00001, 0, 8),
      sample(0.00001, -0.00001, 1, 8),
      sample(0.00002, 0.00001, 2, 8),
    ];

    const decision = evaluateLocationDwell({
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          minDwellMs: 8_000,
          allowPartialWhenUnavailable: true,
        },
      },
    });

    expect(decision.status).toBe('unavailable');
    expect(decision.executionMode).toBe('partial');
    expect(decision.reasons).toContain('insufficient-dwell-span');
  });

  it('returns blocked when unavailable location cannot use partial mode', () => {
    const decision = evaluateLocationDwell({
      samples: [],
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          allowPartialWhenUnavailable: false,
          allowPartialWhenUnstable: false,
        },
      },
    });

    expect(decision.status).toBe('unavailable');
    expect(decision.executionMode).toBe('blocked');
    expect(decision.shouldProceed).toBe(false);
    expect(decision.reasons).toContain('no-samples');
  });

  it('uses precision mode to penalize poor accuracy', () => {
    const samples: LocationSampleLike[] = [
      sample(0.00002, 0.00001, 0, 120),
      sample(0.00002, 0.00001, 1, 140),
      sample(0.00001, 0.00001, 2, 130),
    ];

    const decision = evaluateLocationDwell({
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          precisionMode: 'precision',
          precisionAccuracyMeters: 20,
          confidenceThreshold: 0.7,
        },
      },
    });

    expect(decision.status).toBe('unstable');
    expect(decision.reasons).toContain('confidence-below-threshold');
    expect(decision.confidenceComponents.precisionScore).toBe(0);
  });

  it('is deterministic for an identical trace and policy', () => {
    const samples: LocationSampleLike[] = [
      sample(0.00003, 0.00001, 0, 10),
      sample(0.00002, 0.00001, 1, 12),
      sample(0.00001, -0.00001, 2, 9),
      sample(0.00002, -0.00002, 3, 11),
    ];

    const input = {
      samples,
      evaluatedAtMs: BASE_TIME,
      engineDefinition: {
        locationPolicy: {
          target: BASE_TARGET,
          minSamples: 3,
        },
      },
    };

    const first = evaluateLocationDwell(input);
    const second = evaluateLocationDwell(input);
    const runtimeDecision = toLocationDwellRuntimeDecision(first);

    expect(first).toEqual(second);
    expect(classifyLocationDwell(input)).toBe(first.status);
    expect(runtimeDecision.reason).toBe('stable');
  });
});
