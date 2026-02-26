import {
  AI_BUDGET_DEFAULT_POLICY,
  type AiBudgetBlockedReason,
  type AiBudgetDecision,
  type AiBudgetGuardState,
  type AiBudgetPolicy,
  consumeAiBudget,
  createAiBudgetGuardState,
  type VisionProviderPath,
} from './ai-budget-guard';

export const DATAMATRIX_VISION_FEATURE_FLAGS = {
  officialPathEnabled: 'DATAMATRIX_V2_VISION_OFFICIAL_ENABLED',
  optionalPathEnabled: 'DATAMATRIX_V2_VISION_OPTIONAL_ENABLED',
} as const;

export interface VisionFallbackFeatureFlags {
  officialEnabled: boolean;
  optionalEnabled: boolean;
}

export type VisionProviderPreference = VisionProviderPath | 'auto';

export interface VisionFallbackInput {
  sessionId: string;
  scanAttemptId: string;
  scanPayload: string;
  imageBase64?: string;
  occurredAt: number;
  providerPreference?: VisionProviderPreference;
  aiBudgetPolicy?: Partial<AiBudgetPolicy>;
  featureFlags?: VisionFallbackFeatureFlags;
  providerTimeoutMs?: number;
}

export interface VisionUploadDescriptor {
  uploadId: string;
  uploadedAt: number;
  byteLength: number;
}

export interface VisionFallbackState {
  budget: AiBudgetGuardState;
  uploadsByScanAttempt: Record<string, VisionUploadDescriptor>;
}

export type VisionProviderResult =
  | {
      status: 'success';
      summary: string;
      providerId: string;
      model?: string;
      payload?: Record<string, unknown> | null;
    }
  | {
      status: 'unavailable';
      reason: string;
      providerId?: string;
    };

export interface VisionProviderRequest {
  providerPath: VisionProviderPath;
  scanHash: string;
  scanPayload: string;
  upload: VisionUploadDescriptor | null;
  sessionId: string;
  scanAttemptId: string;
}

export interface VisionFallbackDeps {
  uploadImage?: (input: {
    sessionId: string;
    scanAttemptId: string;
    imageBase64: string;
    occurredAt: number;
  }) => Promise<VisionUploadDescriptor>;
  runVisionProvider?: (
    input: VisionProviderRequest,
  ) => Promise<VisionProviderResult>;
}

export type VisionFallbackFailureCode =
  | 'ai_budget_scan_cap_exceeded'
  | 'ai_budget_session_cap_exceeded'
  | 'ai_budget_dedupe_window_active'
  | 'provider_disabled'
  | 'provider_timeout'
  | 'provider_unavailable'
  | 'provider_error';

export interface VisionFallbackAttempt {
  providerPath: VisionProviderPath;
  providerTag: VisionProviderPath;
  providerId: string | null;
  status: 'success' | 'unavailable' | 'timeout' | 'error' | 'blocked';
  reason?: string;
}

export interface VisionFallbackResponse {
  route: 'vision_fallback';
  sessionId: string;
  scanAttemptId: string;
  scanHash: string;
  status: 'resolved' | 'blocked' | 'failed';
  providerTag: VisionProviderPath | null;
  providerId: string | null;
  reason: VisionFallbackFailureCode | null;
  summary: string;
  payload: Record<string, unknown> | null;
  upload: {
    performed: boolean;
    reused: boolean;
    uploadId: string | null;
  };
  attempts: VisionFallbackAttempt[];
  occurredAt: number;
}

export interface VisionFallbackOutcome {
  state: VisionFallbackState;
  response: VisionFallbackResponse;
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 12_000;

const DEFAULT_FEATURE_FLAGS: VisionFallbackFeatureFlags = {
  officialEnabled: true,
  optionalEnabled: false,
};

function getRuntimeEnv(): Record<string, string | undefined> {
  if (typeof process === 'undefined' || !process?.env) {
    return {};
  }

  return process.env as Record<string, string | undefined>;
}

function readBooleanFlag(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return fallback;
}

export function resolveVisionFallbackFeatureFlags(
  env: Record<string, string | undefined> = getRuntimeEnv(),
): VisionFallbackFeatureFlags {
  return {
    officialEnabled: readBooleanFlag(
      env[DATAMATRIX_VISION_FEATURE_FLAGS.officialPathEnabled],
      DEFAULT_FEATURE_FLAGS.officialEnabled,
    ),
    optionalEnabled: readBooleanFlag(
      env[DATAMATRIX_VISION_FEATURE_FLAGS.optionalPathEnabled],
      DEFAULT_FEATURE_FLAGS.optionalEnabled,
    ),
  };
}

export function createVisionFallbackState(
  seed: Partial<VisionFallbackState> = {},
): VisionFallbackState {
  return {
    budget: createAiBudgetGuardState(seed.budget),
    uploadsByScanAttempt: { ...(seed.uploadsByScanAttempt ?? {}) },
  };
}

function resolveProviderOrder(
  preference: VisionProviderPreference,
  flags: VisionFallbackFeatureFlags,
): VisionProviderPath[] {
  if (preference === 'official') {
    return flags.officialEnabled ? ['official'] : [];
  }
  if (preference === 'optional') {
    return flags.optionalEnabled ? ['optional'] : [];
  }

  const order: VisionProviderPath[] = [];
  if (flags.officialEnabled) {
    order.push('official');
  }
  if (flags.optionalEnabled) {
    order.push('optional');
  }
  return order;
}

function toBudgetFailureCode(
  reason: AiBudgetBlockedReason,
): VisionFallbackFailureCode {
  if (reason === 'scan_cap_exceeded') {
    return 'ai_budget_scan_cap_exceeded';
  }
  if (reason === 'session_cap_exceeded') {
    return 'ai_budget_session_cap_exceeded';
  }
  return 'ai_budget_dedupe_window_active';
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', encodeUtf8(input));
    return bytesToHex(new Uint8Array(digest));
  }

  const cryptoModule = await import('node:crypto');
  return cryptoModule.createHash('sha256').update(input).digest('hex');
}

function normalizeBase64Payload(value: string): string {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIndex >= 0) {
    return trimmed.slice(commaIndex + 1);
  }
  return trimmed;
}

async function defaultUploadImage(input: {
  imageBase64: string;
  occurredAt: number;
}): Promise<VisionUploadDescriptor> {
  const payload = normalizeBase64Payload(input.imageBase64);
  const digest = await sha256Hex(payload);
  return {
    uploadId: `vision-upload-${digest.slice(0, 16)}`,
    uploadedAt: input.occurredAt,
    byteLength: payload.length,
  };
}

function tryParsePayload(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

async function defaultRunVisionProvider(
  input: VisionProviderRequest,
): Promise<VisionProviderResult> {
  const providerId =
    input.providerPath === 'official'
      ? 'datamatrix-official-vision'
      : 'datamatrix-optional-vision';

  const parsedPayload = tryParsePayload(input.scanPayload);
  if (parsedPayload) {
    return {
      status: 'success',
      providerId,
      summary: 'Parsed structured payload from fallback scan.',
      model: 'rule-based-json-parser',
      payload: parsedPayload,
    };
  }

  const normalized = input.scanPayload.trim();
  if (normalized.length === 0) {
    return {
      status: 'unavailable',
      reason: 'empty_scan_payload',
      providerId,
    };
  }

  return {
    status: 'success',
    providerId,
    summary: 'Vision fallback extracted non-engine scan content.',
    model: 'rule-based-text-extractor',
    payload: {
      text: normalized.slice(0, 512),
      uploadId: input.upload?.uploadId ?? null,
    },
  };
}

async function runWithTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
  });

  const result = await Promise.race([
    task.then((value) => ({ timedOut: false as const, value })),
    timeoutPromise,
  ]);

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  return result;
}

async function resolveUploadState(
  input: VisionFallbackInput,
  state: VisionFallbackState,
  uploadImage: NonNullable<VisionFallbackDeps['uploadImage']>,
) {
  if (!input.imageBase64) {
    return {
      upload: null,
      uploadMeta: {
        performed: false,
        reused: false,
        uploadId: null,
      },
      nextState: state,
    };
  }

  const existingUpload = state.uploadsByScanAttempt[input.scanAttemptId];
  if (existingUpload) {
    return {
      upload: existingUpload,
      uploadMeta: {
        performed: false,
        reused: true,
        uploadId: existingUpload.uploadId,
      },
      nextState: state,
    };
  }

  const uploaded = await uploadImage({
    sessionId: input.sessionId,
    scanAttemptId: input.scanAttemptId,
    imageBase64: input.imageBase64,
    occurredAt: input.occurredAt,
  });

  return {
    upload: uploaded,
    uploadMeta: {
      performed: true,
      reused: false,
      uploadId: uploaded.uploadId,
    },
    nextState: {
      ...state,
      uploadsByScanAttempt: {
        ...state.uploadsByScanAttempt,
        [input.scanAttemptId]: uploaded,
      },
    },
  };
}

function mergeUploadMeta(
  current: VisionFallbackResponse['upload'],
  next: VisionFallbackResponse['upload'],
): VisionFallbackResponse['upload'] {
  return {
    performed: current.performed || next.performed,
    reused: current.reused || next.reused,
    uploadId: next.uploadId ?? current.uploadId,
  };
}

function buildBudgetBlockedResponse(args: {
  input: VisionFallbackInput;
  scanHash: string;
  providerPath: VisionProviderPath;
  decision: AiBudgetDecision;
  attempts: VisionFallbackAttempt[];
  uploadMeta: VisionFallbackResponse['upload'];
}) {
  return {
    route: 'vision_fallback' as const,
    sessionId: args.input.sessionId,
    scanAttemptId: args.input.scanAttemptId,
    scanHash: args.scanHash,
    status: 'blocked' as const,
    providerTag: args.providerPath,
    providerId: null,
    reason: toBudgetFailureCode(args.decision.reason as AiBudgetBlockedReason),
    summary: `Vision fallback blocked by AI budget guard (${args.decision.reason}).`,
    payload: null,
    upload: args.uploadMeta,
    attempts: args.attempts,
    occurredAt: args.input.occurredAt,
  };
}

export async function runVisionFallback(
  input: VisionFallbackInput,
  state: VisionFallbackState = createVisionFallbackState(),
  deps: VisionFallbackDeps = {},
): Promise<VisionFallbackOutcome> {
  const normalizedState = createVisionFallbackState(state);
  const flags = input.featureFlags ?? resolveVisionFallbackFeatureFlags();
  const providerPreference = input.providerPreference ?? 'auto';
  const providerOrder = resolveProviderOrder(providerPreference, flags);
  const runVisionProvider = deps.runVisionProvider ?? defaultRunVisionProvider;
  const uploadImage = deps.uploadImage ?? defaultUploadImage;
  const providerTimeoutMs = Math.max(
    100,
    Math.floor(input.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS),
  );
  const policy: Partial<AiBudgetPolicy> = {
    ...AI_BUDGET_DEFAULT_POLICY,
    ...(input.aiBudgetPolicy ?? {}),
  };

  const scanHash = await sha256Hex(
    JSON.stringify({
      payload: input.scanPayload,
      image: input.imageBase64
        ? normalizeBase64Payload(input.imageBase64)
        : null,
    }),
  );

  if (providerOrder.length === 0) {
    return {
      state: normalizedState,
      response: {
        route: 'vision_fallback',
        sessionId: input.sessionId,
        scanAttemptId: input.scanAttemptId,
        scanHash,
        status: 'failed',
        providerTag: null,
        providerId: null,
        reason: 'provider_disabled',
        summary:
          'Vision fallback provider path is disabled by feature flags for this environment.',
        payload: null,
        upload: {
          performed: false,
          reused: false,
          uploadId: null,
        },
        attempts: [],
        occurredAt: input.occurredAt,
      },
    };
  }

  let nextState = normalizedState;
  const attempts: VisionFallbackAttempt[] = [];
  let uploadMeta: VisionFallbackResponse['upload'] = {
    performed: false,
    reused: false,
    uploadId: null,
  };

  for (const providerPath of providerOrder) {
    const budgetDecision = consumeAiBudget({
      state: nextState.budget,
      sessionId: input.sessionId,
      scanAttemptId: input.scanAttemptId,
      scanHash,
      providerPath,
      occurredAt: input.occurredAt,
      policy,
    });

    nextState = {
      ...nextState,
      budget: budgetDecision.nextState,
    };

    if (!budgetDecision.allowed) {
      attempts.push({
        providerPath,
        providerTag: providerPath,
        providerId: null,
        status: 'blocked',
        reason: budgetDecision.reason,
      });

      return {
        state: nextState,
        response: buildBudgetBlockedResponse({
          input,
          scanHash,
          providerPath,
          decision: budgetDecision,
          attempts,
          uploadMeta,
        }),
      };
    }

    const uploadState = await resolveUploadState(input, nextState, uploadImage);
    nextState = uploadState.nextState;
    uploadMeta = mergeUploadMeta(uploadMeta, uploadState.uploadMeta);

    try {
      const timedResult = await runWithTimeout(
        runVisionProvider({
          providerPath,
          scanHash,
          scanPayload: input.scanPayload,
          upload: uploadState.upload,
          sessionId: input.sessionId,
          scanAttemptId: input.scanAttemptId,
        }),
        providerTimeoutMs,
      );

      if (timedResult.timedOut) {
        attempts.push({
          providerPath,
          providerTag: providerPath,
          providerId: null,
          status: 'timeout',
          reason: `timed_out_after_${providerTimeoutMs}ms`,
        });
        continue;
      }

      if (timedResult.value.status === 'success') {
        attempts.push({
          providerPath,
          providerTag: providerPath,
          providerId: timedResult.value.providerId,
          status: 'success',
        });

        return {
          state: nextState,
          response: {
            route: 'vision_fallback',
            sessionId: input.sessionId,
            scanAttemptId: input.scanAttemptId,
            scanHash,
            status: 'resolved',
            providerTag: providerPath,
            providerId: timedResult.value.providerId,
            reason: null,
            summary: timedResult.value.summary,
            payload: timedResult.value.payload ?? null,
            upload: uploadMeta,
            attempts,
            occurredAt: input.occurredAt,
          },
        };
      }

      attempts.push({
        providerPath,
        providerTag: providerPath,
        providerId: timedResult.value.providerId ?? null,
        status: 'unavailable',
        reason: timedResult.value.reason,
      });
    } catch (error) {
      attempts.push({
        providerPath,
        providerTag: providerPath,
        providerId: null,
        status: 'error',
        reason:
          error instanceof Error
            ? error.message
            : 'unknown_provider_execution_error',
      });
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  const failureReason: VisionFallbackFailureCode =
    lastAttempt?.status === 'timeout'
      ? 'provider_timeout'
      : lastAttempt?.status === 'unavailable'
        ? 'provider_unavailable'
        : 'provider_error';

  return {
    state: nextState,
    response: {
      route: 'vision_fallback',
      sessionId: input.sessionId,
      scanAttemptId: input.scanAttemptId,
      scanHash,
      status: 'failed',
      providerTag: null,
      providerId: null,
      reason: failureReason,
      summary:
        'Vision fallback did not resolve a provider response within policy bounds.',
      payload: null,
      upload: uploadMeta,
      attempts,
      occurredAt: input.occurredAt,
    },
  };
}
