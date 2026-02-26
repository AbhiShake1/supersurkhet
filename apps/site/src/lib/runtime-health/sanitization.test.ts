import { describe, expect, it } from 'vitest';
import {
  computeStackFingerprint,
  hasGraphMirrorRedactionParity,
  normalizeStack,
  REDACTED_VALUE,
  sanitizeRuntimeHealthEvent,
} from './sanitization';

describe('runtime-health sanitization', () => {
  it('uses allowlist-first serialization and drops unknown root payloads', () => {
    const sanitized = sanitizeRuntimeHealthEvent({
      timestamp: '2026-02-25T00:00:00.000Z',
      eventType: 'runtime-error',
      message: 'something failed',
      payload: {
        rawRequestBody: '{"token":"abc"}',
      },
      raw: 'private',
    });

    expect(sanitized.eventType).toBe('runtime-error');
    expect((sanitized as Record<string, unknown>).payload).toBeUndefined();
    expect((sanitized as Record<string, unknown>).raw).toBeUndefined();
  });

  it('redacts sensitive keys and value patterns from metadata', () => {
    const sanitized = sanitizeRuntimeHealthEvent({
      timestamp: '2026-02-25T00:00:00.000Z',
      metadata: {
        apiKey: 'sk-super-secret-token',
        nested: {
          Authorization: 'Bearer token-value',
          safe: 'retained',
        },
      },
    });

    expect(sanitized.metadata?.apiKey).toBe(REDACTED_VALUE);
    expect(
      (sanitized.metadata?.nested as Record<string, unknown>).Authorization,
    ).toBe(REDACTED_VALUE);
    expect((sanitized.metadata?.nested as Record<string, unknown>).safe).toBe(
      'retained',
    );
  });

  it('normalizes stack traces before generating fingerprints', () => {
    const stackA = `Error: boom\n    at runTask (https://example.com/main.ts:10:5)\n    at render (https://example.com/render.ts:99:1)`;
    const stackB = `Error: boom\n    at runTask (https://example.com/main.ts:88:7)\n    at render (https://example.com/render.ts:100:9)`;

    const normalizedA = normalizeStack(stackA);
    const normalizedB = normalizeStack(stackB);

    expect(normalizedA).toBe(normalizedB);

    const fingerprintA = computeStackFingerprint({
      message: 'boom',
      component: 'editor',
      surface: 'builder',
      normalizedStack: normalizedA,
    });
    const fingerprintB = computeStackFingerprint({
      message: 'boom',
      component: 'editor',
      surface: 'builder',
      normalizedStack: normalizedB,
    });

    expect(fingerprintA).toBe(fingerprintB);
  });

  it('maintains local and graph mirror redaction parity', () => {
    const rawEvent = {
      timestamp: '2026-02-25T00:00:00.000Z',
      eventType: 'runtime-error',
      message: 'failed with Bearer hidden-token',
      metadata: {
        token: 'abc123',
      },
    };

    expect(hasGraphMirrorRedactionParity(rawEvent)).toBe(true);

    const sanitized = sanitizeRuntimeHealthEvent(rawEvent);
    expect(sanitized.message).toBe(REDACTED_VALUE);
    expect(sanitized.metadata?.token).toBe(REDACTED_VALUE);
  });
});
