import { describe, expect, it, vi } from 'vitest';
import { createScanRouter } from './scan-router';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function createSignedScanPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    payload: {
      version: '2.0',
      engineId: 'engine-cafe-01',
      workflowId: 'workflow-table-7',
      deterministicMessage: 'Open table 7 ordering lane.',
      action: {
        version: '1.0',
        action: 'navigate',
        navigation: {
          url: 'https://supersurkhet.com/menu',
          params: {
            table: '7',
          },
        },
      },
      ...overrides,
    },
    signature: 'signature-ok',
  });
}

function createSignedRefScanPayload(
  nowSeconds: number,
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify({
    payload: {
      tokenVersion: '2',
      payloadVersion: '2',
      lane: 'deterministic',
      issuedAt: nowSeconds - 60,
      expiresAt: nowSeconds + 120,
      nonce: 'nonce-abcdef12',
      reference: {
        businessId: 'biz-01',
        engineId: 'engine-signed-ref-01',
        engineVersion: 'v1',
      },
      metadata: {
        deterministicMessage: 'Signed ref token accepted.',
      },
      ...overrides,
    },
    signature: 'signature-ok-signed-ref',
    signatureAlgorithm: 'HS256',
  });
}

describe('scan-router', () => {
  it('routes a valid signed engine scan through deterministic lane without fallback AI', async () => {
    const executeDeterministic = vi.fn();
    const appendAgentMessage = vi.fn();
    const invokeFallbackAi = vi.fn();

    const router = createScanRouter({
      verifySignedToken: () => true,
      executeDeterministic,
      appendAgentMessage,
      invokeFallbackAi,
    });

    const result = await router.routeScan(createSignedScanPayload(), {
      source: 'test',
      sessionId: 'session-a',
    });

    expect(result.lane).toBe('deterministic');
    if (result.lane !== 'deterministic') {
      return;
    }
    expect(result.source).toBe('signed_engine');
    expect(result.outcome).toBe('executed');
    expect(result.action?.action).toBe('navigate');
    expect(appendAgentMessage).toHaveBeenCalledTimes(1);
    expect(executeDeterministic).toHaveBeenCalledTimes(1);
    expect(invokeFallbackAi).not.toHaveBeenCalled();
  });

  it('routes signature failures to fallback and dedupes repeated scans', async () => {
    const invokeFallbackAi = vi.fn().mockResolvedValue({
      provider: 'mock-ai',
      summary: 'fallback-response',
    });

    const router = createScanRouter({
      verifySignedToken: () => false,
      invokeFallbackAi,
      now: (() => {
        let tick = 10;
        return () => tick++;
      })(),
      dedupeWindowMs: 60_000,
    });

    const first = await router.routeScan(createSignedScanPayload(), {
      source: 'test',
      sessionId: 'session-b',
    });
    const second = await router.routeScan(createSignedScanPayload(), {
      source: 'test',
      sessionId: 'session-b',
    });

    expect(first.lane).toBe('fallback');
    expect(second.lane).toBe('fallback');
    if (first.lane !== 'fallback' || second.lane !== 'fallback') {
      return;
    }
    expect(first.parserErrorCode).toBe('signature_verification_failed');
    expect(first.outcome).toBe('ai_invoked');
    expect(second.outcome).toBe('suppressed_deduped');
    expect(invokeFallbackAi).toHaveBeenCalledTimes(1);
  });

  it('caps fallback AI calls by budget', async () => {
    const invokeFallbackAi = vi.fn().mockResolvedValue({ ok: true });
    const now = (() => {
      let tick = 0;
      return () => {
        tick += 1_000;
        return tick;
      };
    })();

    const router = createScanRouter({
      maxFallbackAiCalls: 2,
      dedupeWindowMs: 1,
      invokeFallbackAi,
      now,
    });

    const first = await router.routeScan('not-json-1', {
      sessionId: 'budget-window',
    });
    const second = await router.routeScan('not-json-2', {
      sessionId: 'budget-window',
    });
    const third = await router.routeScan('not-json-3', {
      sessionId: 'budget-window',
    });

    expect(first.lane).toBe('fallback');
    expect(second.lane).toBe('fallback');
    expect(third.lane).toBe('fallback');
    if (
      first.lane !== 'fallback' ||
      second.lane !== 'fallback' ||
      third.lane !== 'fallback'
    ) {
      return;
    }

    expect(first.outcome).toBe('ai_invoked');
    expect(second.outcome).toBe('ai_invoked');
    expect(third.outcome).toBe('suppressed_budget');
    expect(invokeFallbackAi).toHaveBeenCalledTimes(2);
  });

  it('blocks deterministic execution when location gate is unstable', async () => {
    const executeDeterministic = vi.fn();
    const invokeFallbackAi = vi.fn();

    const router = createScanRouter({
      verifySignedToken: () => true,
      evaluateLocation: () => ({
        status: 'unstable',
        reason: 'dwell-window-not-met',
      }),
      executeDeterministic,
      invokeFallbackAi,
    });

    const result = await router.routeScan(createSignedScanPayload(), {
      sessionId: 'location-gate',
    });

    expect(result.lane).toBe('deterministic');
    if (result.lane !== 'deterministic') {
      return;
    }
    expect(result.outcome).toBe('blocked_location');
    expect(result.location.status).toBe('unstable');
    expect(executeDeterministic).not.toHaveBeenCalled();
    expect(invokeFallbackAi).not.toHaveBeenCalled();
  });

  it('executes deterministic lane when location gate allows partial mode', async () => {
    const executeDeterministic = vi.fn();
    const appendAgentMessage = vi.fn();

    const router = createScanRouter({
      verifySignedToken: () => true,
      evaluateLocation: () => ({
        status: 'unstable',
        reason: 'dwell-window-not-met',
        shouldProceed: true,
        executionMode: 'partial',
      }),
      executeDeterministic,
      appendAgentMessage,
    });

    const result = await router.routeScan(createSignedScanPayload(), {
      sessionId: 'location-partial',
    });

    expect(result.lane).toBe('deterministic');
    if (result.lane !== 'deterministic') {
      return;
    }

    expect(result.outcome).toBe('executed');
    expect(result.location.status).toBe('unstable');
    expect(result.deterministicMessage).toContain('Proceeding in partial mode');
    expect(appendAgentMessage).toHaveBeenCalledTimes(1);
    expect(executeDeterministic).toHaveBeenCalledTimes(1);
  });

  it('supports compact dm2 tokens with base64url payloads', async () => {
    const executeDeterministic = vi.fn();
    const payload = toBase64Url(
      JSON.stringify({
        version: '2.1',
        engineId: 'engine-compact-1',
        deterministicMessage: 'Compact token accepted.',
      }),
    );
    const compactToken = `dm2:${payload}.signature-compact`;

    const router = createScanRouter({
      verifySignedToken: () => true,
      executeDeterministic,
    });

    const result = await router.routeScan(compactToken, {
      sessionId: 'compact',
    });

    expect(result.lane).toBe('deterministic');
    if (result.lane !== 'deterministic') {
      return;
    }
    expect(result.source).toBe('signed_engine');
    expect(result.payload?.engineId).toBe('engine-compact-1');
    expect(executeDeterministic).toHaveBeenCalledTimes(1);
  });

  it('routes canonical signed-ref payloads through deterministic lane', async () => {
    const nowMs = 1_700_000_000_000;
    const router = createScanRouter({
      verifySignedToken: () => true,
      now: () => nowMs,
    });

    const result = await router.routeScan(
      createSignedRefScanPayload(Math.floor(nowMs / 1_000)),
      {
        sessionId: 'signed-ref',
      },
    );

    expect(result.lane).toBe('deterministic');
    if (result.lane !== 'deterministic') {
      return;
    }

    expect(result.outcome).toBe('executed');
    expect(result.payload?.engineId).toBe('engine-signed-ref-01');
    expect(result.deterministicMessage).toContain('Signed ref token accepted.');
  });

  it('routes expired signed-ref tokens to fallback lane', async () => {
    const nowMs = 1_700_000_000_000;
    const router = createScanRouter({
      verifySignedToken: () => true,
      now: () => nowMs,
    });

    const result = await router.routeScan(
      createSignedRefScanPayload(Math.floor(nowMs / 1_000), {
        expiresAt: Math.floor(nowMs / 1_000) - 1,
      }),
      {
        sessionId: 'signed-ref-expired',
      },
    );

    expect(result.lane).toBe('fallback');
    if (result.lane !== 'fallback') {
      return;
    }

    expect(result.parserErrorCode).toBe('token_expired');
    expect(result.outcome).toBe('ai_not_configured');
  });
});
