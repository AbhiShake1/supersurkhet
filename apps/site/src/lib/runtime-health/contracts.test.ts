import { describe, expect, it } from 'vitest';
import {
  aiSafetyDisclosurePolicySchema,
  parseRuntimeHealthEventDoc,
  runtimeHealthEventDocSchema,
  sanitizedTelemetryEnvelopeSchema,
} from '@/lib/runtime-health/contracts';

describe('runtime health contracts', () => {
  it('accepts a valid runtime lifecycle event with required fields', () => {
    const parsed = parseRuntimeHealthEventDoc({
      id: 'evt-1',
      businessId: 'business-1',
      eventType: 'session-open',
      occurredAt: '2026-02-25T00:00:00.000Z',
      telemetry: {
        sessionId: 'session-1',
        surface: 'app-shell',
        severity: 'info',
      },
    });

    expect(parsed.eventType).toBe('session-open');
    expect(parsed.telemetry.surface).toBe('app-shell');
  });

  it('accepts optional fields for runtime-error events', () => {
    const parsed = runtimeHealthEventDocSchema.parse({
      id: 'evt-2',
      businessId: 'business-1',
      eventType: 'runtime-error',
      occurredAt: '2026-02-25T00:00:00.000Z',
      telemetry: {
        sessionId: 'session-1',
        requestId: 'req-1',
        surface: 'plugin-runtime',
        component: 'workflow-runner',
        route: '/admin/plugins',
        pluginId: 'acme.inventory',
        pluginVersion: '1.0.0',
        severity: 'error',
        fingerprint: 'fp-1',
        message: 'Unhandled action failure',
        tags: {
          hook: 'afterUpdate',
        },
        metrics: {
          attempt: 1,
        },
        flags: {
          retryable: false,
        },
        attributes: {
          nodeId: 'node-1',
          retries: 0,
          nested: {
            status: 'failed',
          },
        },
      },
      error: {
        name: 'ActionExecutionError',
        code: 'ACTION_FAILED',
        fingerprint: 'fp-1',
        handled: false,
      },
      source: {
        origin: 'client',
        runtimeVersion: '2026.02.25',
      },
    });

    expect(parsed.error?.fingerprint).toBe('fp-1');
    expect(parsed.source?.origin).toBe('client');
  });

  it('rejects runtime-error events when fingerprint is missing', () => {
    const parsed = runtimeHealthEventDocSchema.safeParse({
      id: 'evt-3',
      businessId: 'business-1',
      eventType: 'runtime-error',
      occurredAt: '2026-02-25T00:00:00.000Z',
      telemetry: {
        sessionId: 'session-1',
        surface: 'assistant',
        severity: 'error',
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects top-level sensitive fields in telemetry envelopes', () => {
    const parsed = sanitizedTelemetryEnvelopeSchema.safeParse({
      sessionId: 'session-1',
      surface: 'assistant',
      severity: 'warn',
      accessToken: 'abc123',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects nested sensitive fields in telemetry attributes', () => {
    const parsed = sanitizedTelemetryEnvelopeSchema.safeParse({
      sessionId: 'session-1',
      surface: 'plugin-runtime',
      severity: 'warn',
      attributes: {
        nested: {
          rawPayload: {
            arbitrary: 'value',
          },
        },
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts disclosure policy with capability-class enums', () => {
    const parsed = aiSafetyDisclosurePolicySchema.parse({
      id: 'policy-default',
      policyVersion: '1',
      disclosureMode: 'high-level-only',
      allowedCapabilityClasses: [
        'runtime-health',
        'rollback-recovery',
        'business-insights',
      ],
      blockedDetailClasses: [
        'secret-material',
        'token-material',
        'raw-telemetry-payload',
      ],
      updatedAt: '2026-02-25T00:00:00.000Z',
    });

    expect(parsed.disclosureMode).toBe('high-level-only');
    expect(parsed.allowedCapabilityClasses).toContain('runtime-health');
  });
});
