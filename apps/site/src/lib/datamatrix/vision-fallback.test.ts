import { describe, expect, it, vi } from 'vitest';
import {
  createVisionFallbackState,
  runVisionFallback,
} from './vision-fallback';

describe('runVisionFallback', () => {
  it('resolves normal path and guarantees one upload per scan attempt', async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      uploadId: 'upload-1',
      uploadedAt: 1_000,
      byteLength: 128,
    });
    const runVisionProvider = vi.fn().mockResolvedValue({
      status: 'success' as const,
      providerId: 'official-provider',
      summary: 'resolved',
      payload: {
        action: 'review',
      },
    });

    const first = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'seat=7',
        imageBase64: 'data:image/png;base64,QUJDRA==',
        occurredAt: 1_000,
        providerPreference: 'official',
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      createVisionFallbackState(),
      {
        uploadImage,
        runVisionProvider,
      },
    );

    const second = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'seat=7',
        imageBase64: 'data:image/png;base64,QUJDRA==',
        occurredAt: 60_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      first.state,
      {
        uploadImage,
        runVisionProvider,
      },
    );

    expect(first.response.status).toBe('resolved');
    expect(first.response.upload.performed).toBe(true);
    expect(second.response.status).toBe('resolved');
    expect(second.response.upload.reused).toBe(true);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(runVisionProvider).toHaveBeenCalledTimes(2);
  });

  it('dedupes repeated scan hashes within dedupe window', async () => {
    const runVisionProvider = vi.fn().mockResolvedValue({
      status: 'success' as const,
      providerId: 'official-provider',
      summary: 'resolved',
    });

    const first = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'table=1',
        occurredAt: 1_000,
        providerPreference: 'official',
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      createVisionFallbackState(),
      {
        runVisionProvider,
      },
    );

    const second = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-2',
        scanPayload: 'table=1',
        occurredAt: 1_500,
        providerPreference: 'official',
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      first.state,
      {
        runVisionProvider,
      },
    );

    expect(first.response.status).toBe('resolved');
    expect(second.response.status).toBe('blocked');
    expect(second.response.reason).toBe('ai_budget_dedupe_window_active');
    expect(runVisionProvider).toHaveBeenCalledTimes(1);
  });

  it('blocks when per-scan cap is exceeded', async () => {
    const runVisionProvider = vi.fn().mockResolvedValue({
      status: 'success' as const,
      providerId: 'official-provider',
      summary: 'resolved',
    });

    const first = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'A',
        occurredAt: 1_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          maxCallsPerScanAttempt: 1,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      createVisionFallbackState(),
      { runVisionProvider },
    );

    const second = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'B',
        occurredAt: 2_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          maxCallsPerScanAttempt: 1,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      first.state,
      { runVisionProvider },
    );

    expect(second.response.status).toBe('blocked');
    expect(second.response.reason).toBe('ai_budget_scan_cap_exceeded');
    expect(runVisionProvider).toHaveBeenCalledTimes(1);
  });

  it('blocks when per-session cap is exceeded', async () => {
    const runVisionProvider = vi.fn().mockResolvedValue({
      status: 'success' as const,
      providerId: 'official-provider',
      summary: 'resolved',
    });

    const first = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'A',
        occurredAt: 1_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          maxCallsPerSession: 2,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      createVisionFallbackState(),
      { runVisionProvider },
    );

    const second = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-2',
        scanPayload: 'B',
        occurredAt: 2_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          maxCallsPerSession: 2,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      first.state,
      { runVisionProvider },
    );

    const third = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-3',
        scanPayload: 'C',
        occurredAt: 3_000,
        providerPreference: 'official',
        aiBudgetPolicy: {
          maxCallsPerSession: 2,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: false,
        },
      },
      second.state,
      { runVisionProvider },
    );

    expect(third.response.status).toBe('blocked');
    expect(third.response.reason).toBe('ai_budget_session_cap_exceeded');
    expect(runVisionProvider).toHaveBeenCalledTimes(2);
  });

  it('falls back from official timeout to optional path and tags provider lane', async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      uploadId: 'upload-1',
      uploadedAt: 1_000,
      byteLength: 128,
    });
    const runVisionProvider = vi.fn(async ({ providerPath }) => {
      if (providerPath === 'official') {
        return await new Promise<never>(() => {
          // Intentionally unresolved to simulate timeout.
        });
      }

      return {
        status: 'success' as const,
        providerId: 'optional-provider',
        summary: 'resolved with optional lane',
      };
    });

    const outcome = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'table=99',
        imageBase64: 'QUJDRA==',
        occurredAt: 1_000,
        providerPreference: 'auto',
        providerTimeoutMs: 5,
        aiBudgetPolicy: {
          maxCallsPerScanAttempt: 4,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: true,
        },
      },
      createVisionFallbackState(),
      {
        uploadImage,
        runVisionProvider,
      },
    );

    expect(outcome.response.status).toBe('resolved');
    expect(outcome.response.providerTag).toBe('optional');
    expect(outcome.response.providerId).toBe('optional-provider');
    expect(outcome.response.upload).toEqual({
      performed: true,
      reused: true,
      uploadId: 'upload-1',
    });
    expect(outcome.response.attempts).toEqual([
      expect.objectContaining({
        providerPath: 'official',
        status: 'timeout',
      }),
      expect.objectContaining({
        providerPath: 'optional',
        status: 'success',
      }),
    ]);
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });

  it('keeps upload metadata when optional lane is blocked by scan cap after official timeout', async () => {
    const uploadImage = vi.fn().mockResolvedValue({
      uploadId: 'upload-cap-1',
      uploadedAt: 1_000,
      byteLength: 128,
    });
    const runVisionProvider = vi.fn(async ({ providerPath }) => {
      if (providerPath === 'official') {
        return await new Promise<never>(() => {
          // Intentionally unresolved to simulate timeout.
        });
      }

      return {
        status: 'success' as const,
        providerId: 'optional-provider',
        summary: 'should-not-run',
      };
    });

    const outcome = await runVisionFallback(
      {
        sessionId: 'session-1',
        scanAttemptId: 'attempt-1',
        scanPayload: 'table=44',
        imageBase64: 'QUJDRA==',
        occurredAt: 1_000,
        providerPreference: 'auto',
        providerTimeoutMs: 5,
        aiBudgetPolicy: {
          maxCallsPerScanAttempt: 1,
          dedupeWindowMs: 1,
        },
        featureFlags: {
          officialEnabled: true,
          optionalEnabled: true,
        },
      },
      createVisionFallbackState(),
      {
        uploadImage,
        runVisionProvider,
      },
    );

    expect(outcome.response.status).toBe('blocked');
    expect(outcome.response.reason).toBe('ai_budget_scan_cap_exceeded');
    expect(outcome.response.providerTag).toBe('optional');
    expect(outcome.response.upload).toEqual({
      performed: true,
      reused: false,
      uploadId: 'upload-cap-1',
    });
    expect(outcome.response.attempts).toEqual([
      expect.objectContaining({
        providerPath: 'official',
        status: 'timeout',
      }),
      expect.objectContaining({
        providerPath: 'optional',
        status: 'blocked',
      }),
    ]);
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(runVisionProvider).toHaveBeenCalledTimes(1);
  });
});
