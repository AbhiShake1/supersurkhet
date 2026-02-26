import { z } from 'zod';
import {
  type DataMatrixAction,
  dataMatrixActionSchema,
  parseQrSignedRefPayload,
  type QrSignedRefPayload,
} from '@/lib/datamatrix';

export const DATAMATRIX_SCAN_BRIDGE_EVENT_NAMES = {
  routeResolved: 'DATAMATRIX_SCAN_ROUTE_RESOLVED',
  deterministicMessageAppended:
    'DATAMATRIX_SCAN_DETERMINISTIC_MESSAGE_APPENDED',
  fallbackRequested: 'DATAMATRIX_SCAN_FALLBACK_REQUESTED',
  fallbackSuppressed: 'DATAMATRIX_SCAN_FALLBACK_SUPPRESSED',
} as const;

export const SCAN_ROUTER_PARSER_ERROR_CODES = [
  'empty_scan',
  'invalid_json',
  'missing_signature',
  'invalid_signed_payload',
  'invalid_engine_payload',
  'unsupported_engine_version',
  'token_not_active',
  'token_expired',
  'signature_verifier_unavailable',
  'signature_verification_failed',
  'non_engine_payload',
] as const;

export type ScanRouterParserErrorCode =
  (typeof SCAN_ROUTER_PARSER_ERROR_CODES)[number];

export type ScanRouterLocationStability = 'stable' | 'unstable' | 'unavailable';

export interface ScanRouterLocationDecision {
  status: ScanRouterLocationStability;
  reason: string;
  shouldProceed?: boolean;
  executionMode?: 'full' | 'partial' | 'blocked';
  confidence?: number;
  reasons?: readonly string[];
}

const DEFAULT_LOCATION_DECISION: ScanRouterLocationDecision = {
  status: 'stable',
  reason: 'location-gate-not-configured',
  shouldProceed: true,
  executionMode: 'full',
};

const signedEnginePayloadSchema = z.object({
  version: z.string().trim().min(1),
  engineId: z.string().trim().min(1),
  workflowId: z.string().trim().min(1).optional(),
  deterministicMessage: z.string().trim().min(1).optional(),
  action: dataMatrixActionSchema.optional(),
  locationPolicy: z.record(z.string(), z.unknown()).optional(),
  retryClass: z.string().trim().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SignedEnginePayload = z.infer<typeof signedEnginePayloadSchema>;

type SignedTokenEnvelope = {
  payload: string | Record<string, unknown>;
  signature?: string;
  protected?: string;
};

type DecodeSignedTokenResult =
  | {
      kind: 'signed_engine';
      payload: SignedEnginePayload;
      signature: string;
      protectedHeader?: string;
      rawToken: string;
    }
  | {
      kind: 'legacy_action';
      action: DataMatrixAction;
    }
  | {
      kind: 'fallback';
      parserErrorCode: ScanRouterParserErrorCode;
      parserErrorMessage: string;
    };

export interface ScanRouterContext {
  source?: string;
  sessionId?: string;
  userId?: string;
  roomId?: string;
}

export interface ScanRouterVerifyInput {
  payload: SignedEnginePayload;
  signature: string;
  protectedHeader?: string;
  rawToken: string;
  context: ScanRouterContext;
}

export interface ScanRouterDeterministicInput {
  routeId: string;
  context: ScanRouterContext;
  source: 'signed_engine' | 'legacy_action';
  payload?: SignedEnginePayload;
  action?: DataMatrixAction;
  location: ScanRouterLocationDecision;
}

export interface ScanRouterFallbackInput {
  routeId: string;
  context: ScanRouterContext;
  rawScan: string;
  parserErrorCode: ScanRouterParserErrorCode;
  parserErrorMessage: string;
  dedupeKey: string;
}

export interface ScanRouterOptions {
  dedupeWindowMs?: number;
  maxFallbackAiCalls?: number;
  now?: () => number;
  verifySignedToken?: (
    input: ScanRouterVerifyInput,
  ) => Promise<boolean> | boolean;
  evaluateLocation?: (
    payload: SignedEnginePayload,
    context: ScanRouterContext,
  ) => Promise<ScanRouterLocationDecision> | ScanRouterLocationDecision;
  appendAgentMessage?: (
    message: string,
    input: ScanRouterDeterministicInput,
  ) => Promise<void> | void;
  executeDeterministic?: (
    input: ScanRouterDeterministicInput,
  ) => Promise<void> | void;
  invokeFallbackAi?: (
    input: ScanRouterFallbackInput,
  ) => Promise<unknown> | unknown;
}

export interface ScanRouterMetrics {
  totalScans: number;
  deterministicScans: number;
  fallbackScans: number;
  fallbackAiInvocations: number;
  fallbackAiSuppressedByDedupe: number;
  fallbackAiSuppressedByBudget: number;
  parserErrors: Partial<Record<ScanRouterParserErrorCode, number>>;
}

export interface ScanRouteDeterministicResult {
  routeId: string;
  lane: 'deterministic';
  source: 'signed_engine' | 'legacy_action';
  outcome: 'executed' | 'blocked_location';
  deterministicMessage: string;
  location: ScanRouterLocationDecision;
  action?: DataMatrixAction;
  payload?: SignedEnginePayload;
  metrics: ScanRouterMetrics;
}

export interface ScanRouteFallbackResult {
  routeId: string;
  lane: 'fallback';
  outcome:
    | 'ai_invoked'
    | 'ai_not_configured'
    | 'suppressed_deduped'
    | 'suppressed_budget';
  parserErrorCode: ScanRouterParserErrorCode;
  parserErrorMessage: string;
  dedupeKey: string;
  fallbackResponse?: unknown;
  metrics: ScanRouterMetrics;
}

export type ScanRouteResult =
  | ScanRouteDeterministicResult
  | ScanRouteFallbackResult;

interface ScanRouterState {
  metrics: ScanRouterMetrics;
  fallbackAiCalls: number;
  lastSeenFallbackByDedupeKey: Map<string, number>;
}

const DEFAULT_DEDUPE_WINDOW_MS = 45_000;
const DEFAULT_MAX_FALLBACK_AI_CALLS = 3;

export class ScanRouter {
  private readonly options: Required<
    Pick<ScanRouterOptions, 'dedupeWindowMs' | 'maxFallbackAiCalls' | 'now'>
  > &
    Omit<ScanRouterOptions, 'dedupeWindowMs' | 'maxFallbackAiCalls' | 'now'>;
  private readonly state: ScanRouterState;

  constructor(options: ScanRouterOptions = {}) {
    this.options = {
      dedupeWindowMs: options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS,
      maxFallbackAiCalls:
        options.maxFallbackAiCalls ?? DEFAULT_MAX_FALLBACK_AI_CALLS,
      now: options.now ?? (() => Date.now()),
      verifySignedToken: options.verifySignedToken,
      evaluateLocation: options.evaluateLocation,
      appendAgentMessage: options.appendAgentMessage,
      executeDeterministic: options.executeDeterministic,
      invokeFallbackAi: options.invokeFallbackAi,
    };
    this.state = {
      fallbackAiCalls: 0,
      lastSeenFallbackByDedupeKey: new Map(),
      metrics: {
        totalScans: 0,
        deterministicScans: 0,
        fallbackScans: 0,
        fallbackAiInvocations: 0,
        fallbackAiSuppressedByDedupe: 0,
        fallbackAiSuppressedByBudget: 0,
        parserErrors: {},
      },
    };
  }

  async routeScan(
    rawScanInput: string,
    context: ScanRouterContext = {},
  ): Promise<ScanRouteResult> {
    this.state.metrics.totalScans += 1;
    const routeNowMs = this.options.now();
    const routeId = createRouteId(routeNowMs);
    const rawScan = rawScanInput.trim();
    const decoded = decodeScanInput(rawScan, {
      nowSeconds: Math.floor(routeNowMs / 1_000),
    });

    if (decoded.kind === 'fallback') {
      this.incrementParserErrorMetric(decoded.parserErrorCode);
      return this.routeFallback({
        routeId,
        rawScan,
        context,
        parserErrorCode: decoded.parserErrorCode,
        parserErrorMessage: decoded.parserErrorMessage,
      });
    }

    if (decoded.kind === 'legacy_action') {
      return this.routeDeterministic({
        routeId,
        context,
        source: 'legacy_action',
        deterministicMessage: `Deterministic legacy action "${decoded.action.action}" accepted.`,
        location: DEFAULT_LOCATION_DECISION,
        action: decoded.action,
      });
    }

    const verified = await this.verifySignedToken(decoded, context);
    if (!verified.ok) {
      this.incrementParserErrorMetric(verified.code);
      return this.routeFallback({
        routeId,
        rawScan,
        context,
        parserErrorCode: verified.code,
        parserErrorMessage: verified.message,
      });
    }

    const locationDecision = await this.evaluateLocation(
      decoded.payload,
      context,
    );
    const deterministicMessage =
      decoded.payload.deterministicMessage ??
      `Deterministic engine "${decoded.payload.engineId}" accepted.`;

    const shouldProceed =
      locationDecision.status === 'stable' ||
      locationDecision.shouldProceed === true;
    if (!shouldProceed) {
      const blockedMessage = `${deterministicMessage} Waiting for stable location (${locationDecision.reason}).`;
      await this.options.appendAgentMessage?.(blockedMessage, {
        routeId,
        context,
        source: 'signed_engine',
        payload: decoded.payload,
        action: decoded.payload.action,
        location: locationDecision,
      });

      return this.routeDeterministic({
        routeId,
        context,
        source: 'signed_engine',
        deterministicMessage: blockedMessage,
        location: locationDecision,
        action: decoded.payload.action,
        payload: decoded.payload,
        outcome: 'blocked_location',
      });
    }

    const executionMessage =
      locationDecision.status === 'stable'
        ? deterministicMessage
        : `${deterministicMessage} Proceeding in ${locationDecision.executionMode ?? 'partial'} mode (${locationDecision.reason}).`;

    await this.options.appendAgentMessage?.(executionMessage, {
      routeId,
      context,
      source: 'signed_engine',
      payload: decoded.payload,
      action: decoded.payload.action,
      location: locationDecision,
    });

    return this.routeDeterministic({
      routeId,
      context,
      source: 'signed_engine',
      deterministicMessage: executionMessage,
      location: locationDecision,
      action: decoded.payload.action,
      payload: decoded.payload,
      outcome: 'executed',
    });
  }

  getMetrics(): ScanRouterMetrics {
    return cloneMetrics(this.state.metrics);
  }

  resetBudgets() {
    this.state.fallbackAiCalls = 0;
    this.state.lastSeenFallbackByDedupeKey.clear();
  }

  private async verifySignedToken(
    decoded: Extract<DecodeSignedTokenResult, { kind: 'signed_engine' }>,
    context: ScanRouterContext,
  ): Promise<
    | { ok: true }
    | { ok: false; code: ScanRouterParserErrorCode; message: string }
  > {
    if (!this.options.verifySignedToken) {
      return {
        ok: false,
        code: 'signature_verifier_unavailable',
        message:
          'Signed engine payload received but no verifier is configured.',
      };
    }

    try {
      const verified = await this.options.verifySignedToken({
        payload: decoded.payload,
        signature: decoded.signature,
        protectedHeader: decoded.protectedHeader,
        rawToken: decoded.rawToken,
        context,
      });

      if (verified) {
        return { ok: true };
      }

      return {
        ok: false,
        code: 'signature_verification_failed',
        message: 'Signature verification failed for signed engine payload.',
      };
    } catch (error) {
      return {
        ok: false,
        code: 'signature_verification_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Signature verification failed for signed engine payload.',
      };
    }
  }

  private async evaluateLocation(
    payload: SignedEnginePayload,
    context: ScanRouterContext,
  ): Promise<ScanRouterLocationDecision> {
    if (!this.options.evaluateLocation) {
      return DEFAULT_LOCATION_DECISION;
    }

    try {
      const decision = await this.options.evaluateLocation(payload, context);
      if (!decision || !decision.status) {
        return {
          status: 'unavailable',
          reason: 'location-gate-returned-empty-decision',
          shouldProceed: false,
          executionMode: 'blocked',
        };
      }
      if (
        decision.status !== 'stable' &&
        decision.status !== 'unstable' &&
        decision.status !== 'unavailable'
      ) {
        return {
          status: 'unavailable',
          reason: 'location-gate-returned-invalid-status',
          shouldProceed: false,
          executionMode: 'blocked',
        };
      }
      return {
        ...decision,
        reason:
          typeof decision.reason === 'string' &&
          decision.reason.trim().length > 0
            ? decision.reason
            : `location-gate-${decision.status}`,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        reason:
          error instanceof Error
            ? error.message
            : 'location-gate-failed-with-unknown-error',
        shouldProceed: false,
        executionMode: 'blocked',
      };
    }
  }

  private async routeDeterministic(input: {
    routeId: string;
    context: ScanRouterContext;
    source: 'signed_engine' | 'legacy_action';
    deterministicMessage: string;
    location: ScanRouterLocationDecision;
    action?: DataMatrixAction;
    payload?: SignedEnginePayload;
    outcome?: 'executed' | 'blocked_location';
  }): Promise<ScanRouteDeterministicResult> {
    this.state.metrics.deterministicScans += 1;
    const outcome = input.outcome ?? 'executed';

    if (outcome === 'executed') {
      await this.options.executeDeterministic?.({
        routeId: input.routeId,
        context: input.context,
        source: input.source,
        payload: input.payload,
        action: input.action,
        location: input.location,
      });
    }

    return {
      routeId: input.routeId,
      lane: 'deterministic',
      source: input.source,
      outcome,
      deterministicMessage: input.deterministicMessage,
      location: input.location,
      action: input.action,
      payload: input.payload,
      metrics: cloneMetrics(this.state.metrics),
    };
  }

  private async routeFallback(input: {
    routeId: string;
    rawScan: string;
    context: ScanRouterContext;
    parserErrorCode: ScanRouterParserErrorCode;
    parserErrorMessage: string;
  }): Promise<ScanRouteFallbackResult> {
    this.state.metrics.fallbackScans += 1;

    const dedupeKey = buildDedupeKey(input.context, input.rawScan);
    const now = this.options.now();
    const previousSeenAt =
      this.state.lastSeenFallbackByDedupeKey.get(dedupeKey);
    if (
      typeof previousSeenAt === 'number' &&
      now - previousSeenAt < this.options.dedupeWindowMs
    ) {
      this.state.metrics.fallbackAiSuppressedByDedupe += 1;
      return {
        routeId: input.routeId,
        lane: 'fallback',
        outcome: 'suppressed_deduped',
        parserErrorCode: input.parserErrorCode,
        parserErrorMessage: input.parserErrorMessage,
        dedupeKey,
        metrics: cloneMetrics(this.state.metrics),
      };
    }

    if (this.state.fallbackAiCalls >= this.options.maxFallbackAiCalls) {
      this.state.metrics.fallbackAiSuppressedByBudget += 1;
      return {
        routeId: input.routeId,
        lane: 'fallback',
        outcome: 'suppressed_budget',
        parserErrorCode: input.parserErrorCode,
        parserErrorMessage: input.parserErrorMessage,
        dedupeKey,
        metrics: cloneMetrics(this.state.metrics),
      };
    }

    this.state.lastSeenFallbackByDedupeKey.set(dedupeKey, now);

    if (!this.options.invokeFallbackAi) {
      return {
        routeId: input.routeId,
        lane: 'fallback',
        outcome: 'ai_not_configured',
        parserErrorCode: input.parserErrorCode,
        parserErrorMessage: input.parserErrorMessage,
        dedupeKey,
        metrics: cloneMetrics(this.state.metrics),
      };
    }

    const fallbackResponse = await this.options.invokeFallbackAi({
      routeId: input.routeId,
      context: input.context,
      rawScan: input.rawScan,
      parserErrorCode: input.parserErrorCode,
      parserErrorMessage: input.parserErrorMessage,
      dedupeKey,
    });

    this.state.fallbackAiCalls += 1;
    this.state.metrics.fallbackAiInvocations += 1;

    return {
      routeId: input.routeId,
      lane: 'fallback',
      outcome: 'ai_invoked',
      parserErrorCode: input.parserErrorCode,
      parserErrorMessage: input.parserErrorMessage,
      dedupeKey,
      fallbackResponse,
      metrics: cloneMetrics(this.state.metrics),
    };
  }

  private incrementParserErrorMetric(code: ScanRouterParserErrorCode) {
    this.state.metrics.parserErrors[code] =
      (this.state.metrics.parserErrors[code] ?? 0) + 1;
  }
}

export function createScanRouter(options: ScanRouterOptions = {}) {
  return new ScanRouter(options);
}

function cloneMetrics(metrics: ScanRouterMetrics): ScanRouterMetrics {
  return {
    ...metrics,
    parserErrors: { ...metrics.parserErrors },
  };
}

function createRouteId(nowMs: number): string {
  return `scan-route-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDedupeKey(context: ScanRouterContext, rawScan: string): string {
  const sessionKey = context.sessionId?.trim() || 'global';
  return `${sessionKey}:${hashString(rawScan)}`;
}

function decodeScanInput(
  rawScan: string,
  options: { nowSeconds?: number } = {},
): DecodeSignedTokenResult {
  if (!rawScan) {
    return {
      kind: 'fallback',
      parserErrorCode: 'empty_scan',
      parserErrorMessage: 'Scanned payload is empty.',
    };
  }

  const compactToken = tryDecodeCompactSignedToken(rawScan, options);
  if (compactToken) {
    return compactToken;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawScan);
  } catch {
    return {
      kind: 'fallback',
      parserErrorCode: 'invalid_json',
      parserErrorMessage: 'Scanned payload is not valid JSON.',
    };
  }

  const signedEnvelope = extractSignedEnvelope(parsedJson);
  if (signedEnvelope) {
    if (!signedEnvelope.signature?.trim()) {
      return {
        kind: 'fallback',
        parserErrorCode: 'missing_signature',
        parserErrorMessage: 'Signed engine payload is missing a signature.',
      };
    }

    const payloadCandidate = decodePayloadCandidate(signedEnvelope.payload);
    if (!payloadCandidate.ok) {
      return {
        kind: 'fallback',
        parserErrorCode: payloadCandidate.code,
        parserErrorMessage: payloadCandidate.message,
      };
    }

    const payloadParsed = parseSignedEnginePayload(payloadCandidate.value, {
      nowSeconds: options.nowSeconds,
    });
    if (!payloadParsed.ok) {
      return {
        kind: 'fallback',
        parserErrorCode: payloadParsed.code,
        parserErrorMessage: payloadParsed.message,
      };
    }

    return {
      kind: 'signed_engine',
      payload: payloadParsed.payload,
      signature: signedEnvelope.signature,
      protectedHeader: signedEnvelope.protected,
      rawToken: rawScan,
    };
  }

  const legacyParsed = dataMatrixActionSchema.safeParse(parsedJson);
  if (legacyParsed.success) {
    return {
      kind: 'legacy_action',
      action: legacyParsed.data,
    };
  }

  return {
    kind: 'fallback',
    parserErrorCode: 'non_engine_payload',
    parserErrorMessage:
      'Scanned payload does not match signed engine or legacy action contracts.',
  };
}

function tryDecodeCompactSignedToken(
  rawScan: string,
  options: { nowSeconds?: number } = {},
): DecodeSignedTokenResult | null {
  const normalized = rawScan.startsWith('dm2:')
    ? rawScan.slice(4)
    : rawScan.startsWith('datamatrix:')
      ? rawScan.slice('datamatrix:'.length)
      : '';

  if (!normalized) {
    return null;
  }

  const tokenParts = normalized.split('.');
  if (tokenParts.length < 2 || tokenParts.length > 3) {
    return {
      kind: 'fallback',
      parserErrorCode: 'invalid_signed_payload',
      parserErrorMessage:
        'Compact signed engine token must be payload.signature or header.payload.signature.',
    };
  }

  const signature = tokenParts[tokenParts.length - 1]?.trim();
  const payloadEncoded = tokenParts[tokenParts.length - 2];
  const protectedHeader = tokenParts.length === 3 ? tokenParts[0] : undefined;

  if (!signature) {
    return {
      kind: 'fallback',
      parserErrorCode: 'missing_signature',
      parserErrorMessage: 'Compact signed engine token is missing a signature.',
    };
  }

  const payloadDecoded = decodePayloadCandidate(payloadEncoded);
  if (!payloadDecoded.ok) {
    return {
      kind: 'fallback',
      parserErrorCode: payloadDecoded.code,
      parserErrorMessage: payloadDecoded.message,
    };
  }

  const payloadParsed = parseSignedEnginePayload(payloadDecoded.value, {
    nowSeconds: options.nowSeconds,
  });
  if (!payloadParsed.ok) {
    return {
      kind: 'fallback',
      parserErrorCode: payloadParsed.code,
      parserErrorMessage: payloadParsed.message,
    };
  }

  return {
    kind: 'signed_engine',
    payload: payloadParsed.payload,
    signature,
    protectedHeader,
    rawToken: rawScan,
  };
}

function parseSignedEnginePayload(
  payload: Record<string, unknown>,
  options: { nowSeconds?: number } = {},
):
  | { ok: true; payload: SignedEnginePayload }
  | {
      ok: false;
      code: Extract<
        ScanRouterParserErrorCode,
        | 'invalid_engine_payload'
        | 'unsupported_engine_version'
        | 'token_not_active'
        | 'token_expired'
      >;
      message: string;
    } {
  const legacyParsed = signedEnginePayloadSchema.safeParse(payload);
  if (legacyParsed.success) {
    if (!isSupportedEngineVersion(legacyParsed.data.version)) {
      return {
        ok: false,
        code: 'unsupported_engine_version',
        message: `Unsupported signed engine version "${legacyParsed.data.version}".`,
      };
    }

    return { ok: true, payload: legacyParsed.data };
  }

  const signedRefParsed = parseQrSignedRefPayload(payload, {
    nowSeconds: options.nowSeconds,
  });
  if (!signedRefParsed.ok) {
    switch (signedRefParsed.code) {
      case 'unsupported-token-version':
      case 'unsupported-payload-version':
        return {
          ok: false,
          code: 'unsupported_engine_version',
          message:
            'Signed engine payload has an unsupported token/payload version.',
        };
      case 'token-not-active':
        return {
          ok: false,
          code: 'token_not_active',
          message: 'Signed engine token is not active yet.',
        };
      case 'token-expired':
        return {
          ok: false,
          code: 'token_expired',
          message: 'Signed engine token has expired.',
        };
      default:
        return {
          ok: false,
          code: 'invalid_engine_payload',
          message:
            'Signed payload did not match engine payload or signed-ref payload contracts.',
        };
    }
  }

  return {
    ok: true,
    payload: normalizeSignedRefPayload(signedRefParsed.value),
  };
}

function normalizeSignedRefPayload(
  payload: QrSignedRefPayload,
): SignedEnginePayload {
  const metadata = asRecord(payload.metadata) ?? {};
  const workflowId = toNonEmptyString(metadata.workflowId);
  const deterministicMessage = toNonEmptyString(metadata.deterministicMessage);
  const retryClass = toNonEmptyString(metadata.retryClass);
  const legacyActionParsed = dataMatrixActionSchema.safeParse(
    asRecord(metadata.legacyAction) ?? null,
  );

  return {
    version: payload.payloadVersion,
    engineId: payload.reference.engineId,
    workflowId,
    deterministicMessage,
    action: legacyActionParsed.success ? legacyActionParsed.data : undefined,
    locationPolicy: asRecord(payload.locationPolicyOverride) ?? undefined,
    retryClass,
    metadata: {
      ...metadata,
      tokenVersion: payload.tokenVersion,
      payloadVersion: payload.payloadVersion,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      notBefore: payload.notBefore,
      nonce: payload.nonce,
      reference: payload.reference,
    },
  };
}

function extractSignedEnvelope(payload: unknown): SignedTokenEnvelope | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const nested =
    asRecord(record.qrSignedRef) ??
    asRecord(record.signedRef) ??
    asRecord(record.engineSignedRef) ??
    null;

  if (nested) {
    return {
      payload: nested.payload as string | Record<string, unknown>,
      signature: toStringOrUndefined(nested.signature),
      protected: toStringOrUndefined(nested.protected),
    };
  }

  if (record.payload && record.signature) {
    return {
      payload: record.payload as string | Record<string, unknown>,
      signature: toStringOrUndefined(record.signature),
      protected: toStringOrUndefined(record.protected),
    };
  }

  return null;
}

function decodePayloadCandidate(payload: string | Record<string, unknown>):
  | { ok: true; value: Record<string, unknown> }
  | {
      ok: false;
      code: Extract<
        ScanRouterParserErrorCode,
        'invalid_signed_payload' | 'invalid_engine_payload'
      >;
      message: string;
    } {
  if (typeof payload === 'string') {
    const decoded = decodeBase64UrlString(payload);
    if (!decoded) {
      return {
        ok: false,
        code: 'invalid_signed_payload',
        message: 'Signed payload is not valid base64url JSON.',
      };
    }

    try {
      const parsed = JSON.parse(decoded);
      const normalized = asRecord(parsed);
      if (!normalized) {
        return {
          ok: false,
          code: 'invalid_engine_payload',
          message: 'Signed payload JSON must be an object.',
        };
      }
      return {
        ok: true,
        value: normalized,
      };
    } catch {
      return {
        ok: false,
        code: 'invalid_signed_payload',
        message: 'Signed payload is not valid JSON after base64url decoding.',
      };
    }
  }

  const normalized = asRecord(payload);
  if (!normalized) {
    return {
      ok: false,
      code: 'invalid_engine_payload',
      message: 'Signed payload must be an object.',
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

function decodeBase64UrlString(input: string): string | null {
  try {
    const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
    const withPadding = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(withPadding);
    }
    return null;
  } catch {
    return null;
  }
}

function isSupportedEngineVersion(version: string): boolean {
  const normalized = version.trim().toLowerCase();
  return normalized === '2' || normalized.startsWith('2.');
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}
