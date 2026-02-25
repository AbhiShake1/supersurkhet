import { z } from 'zod';

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|cookie|api[_-]?key|credential|oauth|bearer|session/i;
const SENSITIVE_VALUE_PATTERNS = [
  /sk-[a-z0-9]{8,}/i,
  /bearer\s+[a-z0-9\-._~+/]+=*/i,
  /gh[pousr]_[a-z0-9]{8,}/i,
];
const MAX_SANITIZE_DEPTH = 5;

export const aiSafetyCapabilityClasses = [
  'runtime-health',
  'rollback',
  'ai-permission',
  'insights',
  'focus-mode',
] as const;

export const AiSafetyDisclosurePolicySchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  allowedCapabilityClasses: z.array(z.enum(aiSafetyCapabilityClasses)).min(1),
  disallowRawPayloads: z.literal(true),
  disallowSecrets: z.literal(true),
});

export type AiSafetyDisclosurePolicy = z.infer<
  typeof AiSafetyDisclosurePolicySchema
>;

export type RuntimeHealthEventType =
  | 'session_open'
  | 'session_close'
  | 'runtime_error'
  | 'last_known_good_checkpoint';

export type SanitizedTelemetryEnvelope = Record<string, unknown>;

const RuntimeHealthEventTypeSchema = z.enum([
  'session_open',
  'session_close',
  'runtime_error',
  'last_known_good_checkpoint',
]);

const SanitizedTelemetryEnvelopeSchema = z
  .record(z.unknown())
  .refine((value) => !hasSensitiveData(value), {
    message: 'Telemetry contains sensitive fields',
  });

export const RuntimeHealthEventSchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  sessionId: z.string().min(1),
  eventType: RuntimeHealthEventTypeSchema,
  occurredAt: z.string().datetime(),
  surface: z.string().optional(),
  component: z.string().optional(),
  fingerprint: z.string().optional(),
  pluginId: z.string().optional(),
  pluginVersion: z.string().optional(),
  telemetry: SanitizedTelemetryEnvelopeSchema,
});

export type RuntimeHealthEventDoc = z.infer<typeof RuntimeHealthEventSchema>;

export const LastKnownGoodSnapshotSchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  sessionId: z.string().min(1),
  snapshotId: z.string().min(1),
  pluginId: z.string().optional(),
  pluginVersion: z.string().optional(),
  reason: z.string().optional(),
  updatedAt: z.string().datetime(),
});

export type LastKnownGoodSnapshotDoc = z.infer<
  typeof LastKnownGoodSnapshotSchema
>;

type MaybePromise<T> = T | Promise<T>;

export interface RuntimeHealthLocalStore {
  appendEvent(event: RuntimeHealthEventDoc): MaybePromise<void>;
  listEvents(options?: {
    limit?: number;
  }): MaybePromise<RuntimeHealthEventDoc[]>;
}

export interface RuntimeHealthGraphMirrorStore extends RuntimeHealthLocalStore {
  setLastKnownGood(snapshot: LastKnownGoodSnapshotDoc): MaybePromise<void>;
  getLastKnownGood(): MaybePromise<LastKnownGoodSnapshotDoc | null>;
}

export class InMemoryRuntimeHealthLocalStore
  implements RuntimeHealthLocalStore
{
  private readonly events: RuntimeHealthEventDoc[] = [];

  constructor(private readonly capacity = 200) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error('capacity must be a positive integer');
    }
  }

  appendEvent(event: RuntimeHealthEventDoc): void {
    this.events.push(event);
    while (this.events.length > this.capacity) {
      this.events.shift();
    }
  }

  listEvents(options?: { limit?: number }): RuntimeHealthEventDoc[] {
    const limit = options?.limit;
    if (!limit || limit >= this.events.length) {
      return [...this.events];
    }
    return this.events.slice(-limit);
  }
}

export class InMemoryRuntimeHealthGraphMirrorStore
  extends InMemoryRuntimeHealthLocalStore
  implements RuntimeHealthGraphMirrorStore
{
  private lastKnownGood: LastKnownGoodSnapshotDoc | null = null;

  setLastKnownGood(snapshot: LastKnownGoodSnapshotDoc): void {
    this.lastKnownGood = snapshot;
  }

  getLastKnownGood(): LastKnownGoodSnapshotDoc | null {
    return this.lastKnownGood;
  }
}

export function sanitizeTelemetryEnvelope(
  payload: unknown,
): SanitizedTelemetryEnvelope {
  if (!isRecord(payload)) return {};

  const sanitized = sanitizeValue(payload, 0);
  if (!isRecord(sanitized)) return {};
  return sanitized;
}

export function createErrorFingerprint(error: {
  name?: string;
  message?: string;
  stack?: string;
}): string {
  const normalizedParts = [
    normalizeForFingerprint(error.name ?? ''),
    normalizeForFingerprint(error.message ?? ''),
    normalizeForFingerprint(error.stack ?? ''),
  ];
  return `eh_${hashString(normalizedParts.join('|'))}`;
}

export class RuntimeHealthService {
  private readonly sessionId: string;
  private sequence = 0;
  private readonly now: () => number;

  constructor(
    private readonly localStore: RuntimeHealthLocalStore,
    private readonly graphMirrorStore: RuntimeHealthGraphMirrorStore,
    options?: { sessionId?: string; now?: () => number },
  ) {
    this.sessionId = options?.sessionId ?? createSessionId();
    this.now = options?.now ?? Date.now;
  }

  async recordSessionOpen(input?: {
    telemetry?: unknown;
    surface?: string;
    component?: string;
  }): Promise<void> {
    await this.writeEvent({
      eventType: 'session_open',
      surface: input?.surface,
      component: input?.component,
      telemetry: input?.telemetry,
    });
  }

  async recordSessionClose(input?: {
    telemetry?: unknown;
    surface?: string;
    component?: string;
  }): Promise<void> {
    await this.writeEvent({
      eventType: 'session_close',
      surface: input?.surface,
      component: input?.component,
      telemetry: input?.telemetry,
    });
  }

  async recordRuntimeError(input: {
    error: unknown;
    telemetry?: unknown;
    surface?: string;
    component?: string;
    pluginId?: string;
    pluginVersion?: string;
  }): Promise<void> {
    const parsedError = parseUnknownError(input.error);
    const fingerprint = createErrorFingerprint(parsedError);
    const telemetry = sanitizeTelemetryEnvelope({
      ...(isRecord(input.telemetry) ? input.telemetry : {}),
      error: {
        name: parsedError.name,
        message: parsedError.message,
        stack: parsedError.stack,
      },
    });

    await this.writeEvent({
      eventType: 'runtime_error',
      surface: input.surface,
      component: input.component,
      pluginId: input.pluginId,
      pluginVersion: input.pluginVersion,
      fingerprint,
      telemetry,
    });
  }

  async updateLastKnownGood(input: {
    snapshotId: string;
    pluginId?: string;
    pluginVersion?: string;
    reason?: string;
  }): Promise<LastKnownGoodSnapshotDoc> {
    const sanitizedReason =
      typeof input.reason === 'string'
        ? sanitizeText(input.reason) || undefined
        : undefined;
    const snapshot = LastKnownGoodSnapshotSchema.parse({
      id: `lkg:${this.sessionId}:${this.sequence + 1}`,
      version: 1 as const,
      sessionId: this.sessionId,
      snapshotId: input.snapshotId,
      pluginId: input.pluginId,
      pluginVersion: input.pluginVersion,
      reason: sanitizedReason,
      updatedAt: new Date(this.now()).toISOString(),
    });

    await this.withMirrorRetry(() =>
      Promise.resolve(this.graphMirrorStore.setLastKnownGood(snapshot)),
    );

    await this.writeEvent({
      eventType: 'last_known_good_checkpoint',
      pluginId: input.pluginId,
      pluginVersion: input.pluginVersion,
      telemetry: {
        snapshotId: input.snapshotId,
        reason: snapshot.reason ?? null,
      },
    });

    return snapshot;
  }

  async getLedger(options?: {
    limit?: number;
    eventTypes?: RuntimeHealthEventType[];
  }): Promise<RuntimeHealthEventDoc[]> {
    const events = await Promise.resolve(
      this.localStore.listEvents({ limit: options?.limit }),
    );
    if (!options?.eventTypes || options.eventTypes.length === 0) {
      return events;
    }
    const allowed = new Set(options.eventTypes);
    return events.filter((event) => allowed.has(event.eventType));
  }

  async getAssistantRuntimeView(limit = 50): Promise<{
    events: RuntimeHealthEventDoc[];
    lastKnownGood: LastKnownGoodSnapshotDoc | null;
  }> {
    const [events, lastKnownGood] = await Promise.all([
      this.getLedger({ limit }),
      Promise.resolve(this.graphMirrorStore.getLastKnownGood()),
    ]);
    return {
      events,
      lastKnownGood,
    };
  }

  async getRollbackTriggerView(): Promise<{
    lastKnownGood: LastKnownGoodSnapshotDoc | null;
    latestRuntimeError: RuntimeHealthEventDoc | null;
  }> {
    const [events, lastKnownGood] = await Promise.all([
      this.getLedger({ limit: 200 }),
      Promise.resolve(this.graphMirrorStore.getLastKnownGood()),
    ]);

    let latestRuntimeError: RuntimeHealthEventDoc | null = null;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const current = events[index];
      if (current?.eventType === 'runtime_error') {
        latestRuntimeError = current;
        break;
      }
    }

    return { lastKnownGood, latestRuntimeError };
  }

  async evaluateIntegrationReadiness(): Promise<{
    ready: boolean;
    reasons: string[];
  }> {
    const [events, lastKnownGood] = await Promise.all([
      this.getLedger({ limit: 200 }),
      Promise.resolve(this.graphMirrorStore.getLastKnownGood()),
    ]);

    const hasOpen = events.some((event) => event.eventType === 'session_open');
    const hasCloseOrError = events.some(
      (event) =>
        event.eventType === 'session_close' ||
        event.eventType === 'runtime_error',
    );
    const hasSanitizationViolations = events.some((event) =>
      hasSensitiveData(event.telemetry),
    );

    const reasons: string[] = [];
    if (!hasOpen) reasons.push('missing session_open event');
    if (!hasCloseOrError) reasons.push('missing session_close/runtime_error');
    if (!lastKnownGood) reasons.push('missing last_known_good snapshot');
    if (hasSanitizationViolations) reasons.push('sensitive telemetry detected');

    return { ready: reasons.length === 0, reasons };
  }

  private async writeEvent(input: {
    eventType: RuntimeHealthEventType;
    surface?: string;
    component?: string;
    fingerprint?: string;
    pluginId?: string;
    pluginVersion?: string;
    telemetry?: unknown;
  }): Promise<RuntimeHealthEventDoc> {
    const telemetry = sanitizeTelemetryEnvelope(input.telemetry);
    const event = RuntimeHealthEventSchema.parse({
      id: `rhe:${this.sessionId}:${this.nextSequence()}`,
      version: 1 as const,
      sessionId: this.sessionId,
      eventType: input.eventType,
      occurredAt: new Date(this.now()).toISOString(),
      surface: input.surface,
      component: input.component,
      fingerprint: input.fingerprint,
      pluginId: input.pluginId,
      pluginVersion: input.pluginVersion,
      telemetry,
    });

    await Promise.resolve(this.localStore.appendEvent(event));
    await this.withMirrorRetry(() =>
      Promise.resolve(this.graphMirrorStore.appendEvent(event)),
    );

    return event;
  }

  private async withMirrorRetry(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch {
      await operation();
    }
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }
}

export function createRuntimeHealthService(options?: {
  localStore?: RuntimeHealthLocalStore;
  graphMirrorStore?: RuntimeHealthGraphMirrorStore;
  sessionId?: string;
  now?: () => number;
}): RuntimeHealthService {
  const localStore =
    options?.localStore ?? new InMemoryRuntimeHealthLocalStore(200);
  const graphMirrorStore =
    options?.graphMirrorStore ?? new InMemoryRuntimeHealthGraphMirrorStore(200);
  return new RuntimeHealthService(localStore, graphMirrorStore, {
    sessionId: options?.sessionId,
    now: options?.now,
  });
}

export interface RuntimeHealthEventTarget {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

export function bootstrapRuntimeHealth(options?: {
  service?: RuntimeHealthService;
  target?: RuntimeHealthEventTarget;
  getVisibilityState?: () => DocumentVisibilityState | 'visible' | 'hidden';
  onError?: (error: unknown) => void;
}): { service: RuntimeHealthService; dispose: () => void } {
  const service = options?.service ?? createRuntimeHealthService();
  const target = options?.target;
  const reportError = options?.onError ?? (() => undefined);
  let closed = false;

  const closeSession = (reason: string) => {
    if (closed) return;
    closed = true;
    void service.recordSessionClose({
      surface: 'app-shell',
      component: 'root',
      telemetry: { reason },
    });
  };

  void service.recordSessionOpen({
    surface: 'app-shell',
    component: 'root',
    telemetry: { entry: 'bootstrap' },
  });

  if (!target) {
    return {
      service,
      dispose: () => closeSession('dispose_without_target'),
    };
  }

  const onPageHide: EventListener = () => {
    closeSession('pagehide');
  };

  const onVisibilityChange: EventListener = () => {
    const visibilityState = options?.getVisibilityState?.();
    if (visibilityState === 'hidden') {
      closeSession('visibility_hidden');
    }
  };

  const onErrorEvent: EventListener = (event) => {
    const knownEvent = event as Event & {
      message?: string;
      error?: unknown;
      filename?: string;
      lineno?: number;
      colno?: number;
    };
    void service
      .recordRuntimeError({
        error: knownEvent.error ?? knownEvent.message ?? 'unknown-error',
        surface: 'window',
        component: knownEvent.filename,
        telemetry: {
          line: knownEvent.lineno ?? null,
          column: knownEvent.colno ?? null,
        },
      })
      .catch(reportError);
  };

  const onUnhandledRejection: EventListener = (event) => {
    const knownEvent = event as Event & {
      reason?: unknown;
    };
    void service
      .recordRuntimeError({
        error: knownEvent.reason ?? 'unknown-rejection',
        surface: 'window',
        component: 'unhandledrejection',
      })
      .catch(reportError);
  };

  target.addEventListener('pagehide', onPageHide);
  target.addEventListener('visibilitychange', onVisibilityChange);
  target.addEventListener('error', onErrorEvent);
  target.addEventListener('unhandledrejection', onUnhandledRejection);

  return {
    service,
    dispose: () => {
      target.removeEventListener('pagehide', onPageHide);
      target.removeEventListener('visibilitychange', onVisibilityChange);
      target.removeEventListener('error', onErrorEvent);
      target.removeEventListener('unhandledrejection', onUnhandledRejection);
      closeSession('dispose');
    },
  };
}

function parseUnknownError(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name) || 'Error',
      message: sanitizeText(error.message) || 'Unknown error',
      stack: sanitizeText(error.stack ?? ''),
    };
  }
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: sanitizeText(error) || 'Unknown error',
      stack: null,
    };
  }
  return {
    name: 'Error',
    message:
      sanitizeText(JSON.stringify(sanitizeValue(error, 0))) || 'Unknown error',
    stack: null,
  };
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth >= MAX_SANITIZE_DEPTH) return null;
  if (value === null) return null;

  switch (typeof value) {
    case 'string':
      return sanitizeText(value);
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'boolean':
      return value;
    case 'bigint':
      return String(value);
    case 'undefined':
    case 'symbol':
    case 'function':
      return undefined;
    case 'object':
      if (Array.isArray(value)) {
        return value
          .map((item) => sanitizeValue(item, depth + 1))
          .filter((item) => item !== undefined);
      }
      if (!isRecord(value)) return null;
      return sanitizeRecord(value, depth + 1);
    default:
      return undefined;
  }
}

function sanitizeRecord(
  value: Record<string, unknown>,
  depth: number,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    const sanitized = sanitizeValue(nested, depth);
    if (sanitized === undefined) {
      continue;
    }
    output[key] = sanitized;
  }

  return output;
}

function sanitizeText(input: string): string {
  let value = input;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(value)) {
      return '[REDACTED]';
    }
  }
  if (value.length > 1000) {
    value = value.slice(0, 1000);
  }
  return value;
}

function hasSensitiveData(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') {
    return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  }
  if (typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasSensitiveData(item));
  }
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, nested]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) return true;
    return hasSensitiveData(nested);
  });
}

function hashString(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeForFingerprint(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSessionId(): string {
  return `rhs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
