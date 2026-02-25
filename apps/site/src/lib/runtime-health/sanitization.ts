export const REDACTED_VALUE = '[REDACTED]';

const DEFAULT_ALLOWED_ROOT_KEYS = new Set([
  'eventId',
  'timestamp',
  'sessionId',
  'eventType',
  'surface',
  'component',
  'severity',
  'pluginId',
  'pluginVersion',
  'runtimeVersion',
  'message',
  'stack',
  'metadata',
]);

const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(token|secret|password|passphrase|apikey|api[_-]?key|credential|authorization|cookie|session|private[_-]?key)($|[_-])/i;

const SENSITIVE_VALUE_PATTERNS = [
  /\bbearer\s+[a-z0-9._~+/-]+=*/i,
  /\bsk-[a-z0-9]{8,}\b/i,
  /\bgh[pousr]_[a-z0-9]{8,}\b/i,
  /\beyj[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/i,
  /\b(?:xox[baprs]-)[a-z0-9-]{8,}\b/i,
];

const FRAME_PREFIX_PATTERN = /^\s*at\s+/;

export type SanitizedTelemetryValue =
  | string
  | number
  | boolean
  | null
  | SanitizedTelemetryValue[]
  | { [key: string]: SanitizedTelemetryValue };

export type RuntimeHealthSanitizedEvent = {
  eventId?: string;
  timestamp: string;
  sessionId?: string;
  eventType?: string;
  surface?: string;
  component?: string;
  severity?: string;
  pluginId?: string;
  pluginVersion?: string;
  runtimeVersion?: string;
  message?: string;
  stack?: string;
  fingerprint: string;
  metadata?: { [key: string]: SanitizedTelemetryValue };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactSensitiveText(value: string): string {
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    return REDACTED_VALUE;
  }
  return value;
}

function normalizeScalar(value: unknown): SanitizedTelemetryValue {
  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  return String(value);
}

function sanitizeMetadataValue(
  value: unknown,
  keyHint?: string,
): SanitizedTelemetryValue {
  if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
    return REDACTED_VALUE;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMetadataValue(entry));
  }

  if (isRecord(value)) {
    const output: Record<string, SanitizedTelemetryValue> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = sanitizeMetadataValue(nestedValue, key);
    }
    return output;
  }

  return normalizeScalar(value);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(',')}}`;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeStackFrame(frame: string): string {
  let normalized = frame.trim();
  normalized = normalized.replace(/\(.*?\)/g, '(...)');
  normalized = normalized.replace(/:\d+:\d+/g, ':#:#');
  normalized = normalized.replace(/\b[0-9a-f]{8,}\b/gi, '<hex>');
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

export function normalizeStack(stack: string | undefined): string | undefined {
  if (!stack || typeof stack !== 'string') {
    return undefined;
  }

  const frames = stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (FRAME_PREFIX_PATTERN.test(line) ? line : `at ${line}`))
    .map((line) => normalizeStackFrame(line));

  if (frames.length === 0) {
    return undefined;
  }

  return frames.join('\n');
}

export function computeStackFingerprint(input: {
  message?: string;
  component?: string;
  surface?: string;
  normalizedStack?: string;
}): string {
  const parts = [
    input.surface ?? '',
    input.component ?? '',
    input.message ?? '',
    input.normalizedStack ?? '',
  ];
  return hashString(parts.join('|'));
}

export function sanitizeRuntimeHealthEvent(
  rawEvent: unknown,
  options?: { allowedRootKeys?: ReadonlySet<string> },
): RuntimeHealthSanitizedEvent {
  const source = isRecord(rawEvent) ? rawEvent : {};
  const allowedRootKeys = options?.allowedRootKeys ?? DEFAULT_ALLOWED_ROOT_KEYS;

  const sanitizedRoot: Partial<RuntimeHealthSanitizedEvent> = {};
  for (const key of allowedRootKeys) {
    if (!(key in source)) {
      continue;
    }

    if (key === 'metadata') {
      sanitizedRoot.metadata = sanitizeMetadataValue(source[key]) as {
        [key: string]: SanitizedTelemetryValue;
      };
      continue;
    }

    if (key === 'stack') {
      const normalized = normalizeStack(
        typeof source.stack === 'string' ? source.stack : undefined,
      );
      if (normalized) {
        sanitizedRoot.stack = normalized;
      }
      continue;
    }

    if (key === 'message' && typeof source.message === 'string') {
      sanitizedRoot.message = redactSensitiveText(source.message);
      continue;
    }

    const value = source[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      (sanitizedRoot as Record<string, unknown>)[key] = String(value);
    }
  }

  const timestamp =
    typeof sanitizedRoot.timestamp === 'string' &&
    sanitizedRoot.timestamp.length > 0
      ? sanitizedRoot.timestamp
      : new Date(0).toISOString();

  const fingerprint = computeStackFingerprint({
    message: sanitizedRoot.message,
    component: sanitizedRoot.component,
    surface: sanitizedRoot.surface,
    normalizedStack: sanitizedRoot.stack,
  });

  return {
    ...sanitizedRoot,
    timestamp,
    fingerprint,
  };
}

export function sanitizeForGraphMirror(
  rawEvent: unknown,
): RuntimeHealthSanitizedEvent {
  return sanitizeRuntimeHealthEvent(rawEvent);
}

export function hasGraphMirrorRedactionParity(rawEvent: unknown): boolean {
  const localEvent = sanitizeRuntimeHealthEvent(rawEvent);
  const mirrorEvent = sanitizeForGraphMirror(rawEvent);
  return stableStringify(localEvent) === stableStringify(mirrorEvent);
}
