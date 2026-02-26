import type { DataMatrixAction } from './DataMatrixTypes'

export const DATAMATRIX_NATIVE_PARSER_ERROR_CODES = [
  'empty_scan',
  'invalid_json',
  'missing_signature',
  'invalid_signed_payload',
  'invalid_engine_payload',
  'unsupported_engine_version',
  'token_not_active',
  'token_expired',
  'non_engine_payload',
] as const

export type DataMatrixNativeParserErrorCode =
  (typeof DATAMATRIX_NATIVE_PARSER_ERROR_CODES)[number]

export type NativeParsedRoute =
  | {
      lane: 'deterministic'
      message: string
      action?: DataMatrixAction
    }
  | {
      lane: 'fallback'
      parserErrorCode: DataMatrixNativeParserErrorCode
      message: string
      suppressed?: boolean
      showInvalidJsonAlert?: boolean
    }

type NativeSignedTokenEnvelope = {
  payload: string | Record<string, unknown>
  signature?: string
  protected?: string
}

type ParserOptions = {
  nowSeconds?: number
}

export function parseNativeScan(
  rawValue: string,
  options: ParserOptions = {},
): NativeParsedRoute {
  if (!rawValue) {
    return {
      lane: 'fallback',
      parserErrorCode: 'empty_scan',
      message: 'Empty scan ignored.',
      suppressed: true,
    }
  }

  const compactParsed = tryParseCompactSignedToken(rawValue, options)
  if (compactParsed) {
    return compactParsed
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    return {
      lane: 'fallback',
      parserErrorCode: 'invalid_json',
      message: 'Invalid JSON scan routed to fallback lane.',
      showInvalidJsonAlert: true,
    }
  }

  const signedEnvelope = extractSignedEnvelope(parsed)
  if (signedEnvelope) {
    return parseSignedEnvelope(signedEnvelope, options)
  }

  if (isDataMatrixAction(parsed)) {
    return {
      lane: 'deterministic',
      message: `Deterministic action "${parsed.action}" accepted.`,
      action: parsed,
    }
  }

  return {
    lane: 'fallback',
    parserErrorCode: 'non_engine_payload',
    message: 'Non-engine scan routed to fallback lane.',
  }
}

function tryParseCompactSignedToken(
  rawValue: string,
  options: ParserOptions,
): NativeParsedRoute | null {
  const normalized = rawValue.startsWith('dm2:')
    ? rawValue.slice(4)
    : rawValue.startsWith('datamatrix:')
      ? rawValue.slice('datamatrix:'.length)
      : ''
  if (!normalized) {
    return null
  }

  const parts = normalized.split('.')
  if (parts.length < 2 || parts.length > 3) {
    return {
      lane: 'fallback',
      parserErrorCode: 'invalid_signed_payload',
      message:
        'Compact signed token must be payload.signature or header.payload.signature.',
    }
  }

  const signature = parts[parts.length - 1]?.trim()
  if (!signature) {
    return {
      lane: 'fallback',
      parserErrorCode: 'missing_signature',
      message: 'Compact signed token is missing a signature.',
    }
  }

  const payloadEncoded = parts[parts.length - 2]
  const payloadCandidate = decodePayloadCandidate(payloadEncoded)
  if (!payloadCandidate.ok) {
    return {
      lane: 'fallback',
      parserErrorCode: payloadCandidate.code,
      message: payloadCandidate.message,
    }
  }

  return parseEnginePayload(payloadCandidate.value, options)
}

function parseSignedEnvelope(
  envelope: NativeSignedTokenEnvelope,
  options: ParserOptions,
): NativeParsedRoute {
  if (!envelope.signature?.trim()) {
    return {
      lane: 'fallback',
      parserErrorCode: 'missing_signature',
      message: 'Signed engine payload is missing a signature.',
    }
  }

  const payloadCandidate = decodePayloadCandidate(envelope.payload)
  if (!payloadCandidate.ok) {
    return {
      lane: 'fallback',
      parserErrorCode: payloadCandidate.code,
      message: payloadCandidate.message,
    }
  }

  return parseEnginePayload(payloadCandidate.value, options)
}

function parseEnginePayload(
  payload: Record<string, unknown>,
  options: ParserOptions,
): NativeParsedRoute {
  const signedRefResult = parseSignedRefPayload(payload, options)
  if (signedRefResult) {
    return signedRefResult
  }

  const legacyVersion = toNonEmptyString(payload.version)
  const legacyEngineId = toNonEmptyString(payload.engineId)
  if (!legacyVersion || !legacyEngineId) {
    return {
      lane: 'fallback',
      parserErrorCode: 'invalid_engine_payload',
      message: 'Signed payload did not match expected engine contracts.',
    }
  }

  if (!isSupportedEngineVersion(legacyVersion)) {
    return {
      lane: 'fallback',
      parserErrorCode: 'unsupported_engine_version',
      message: `Unsupported signed engine version "${legacyVersion}".`,
    }
  }

  const legacyAction = isDataMatrixAction(payload.action)
    ? payload.action
    : undefined
  const deterministicMessage =
    toNonEmptyString(payload.deterministicMessage) ??
    (legacyAction
      ? `Deterministic action "${legacyAction.action}" accepted.`
      : `Deterministic engine "${legacyEngineId}" accepted.`)

  return {
    lane: 'deterministic',
    message: deterministicMessage,
    action: legacyAction,
  }
}

function parseSignedRefPayload(
  payload: Record<string, unknown>,
  options: ParserOptions,
): NativeParsedRoute | null {
  const tokenVersion = toNonEmptyString(payload.tokenVersion)
  const payloadVersion = toNonEmptyString(payload.payloadVersion)
  const reference = asRecord(payload.reference)

  if (!tokenVersion && !payloadVersion && !reference) {
    return null
  }

  if (!tokenVersion || !payloadVersion || !reference) {
    return {
      lane: 'fallback',
      parserErrorCode: 'invalid_engine_payload',
      message: 'Signed ref payload is missing required fields.',
    }
  }

  if (
    !isSupportedEngineVersion(tokenVersion) ||
    !isSupportedEngineVersion(payloadVersion)
  ) {
    return {
      lane: 'fallback',
      parserErrorCode: 'unsupported_engine_version',
      message: 'Signed ref payload version is not supported.',
    }
  }

  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1_000)
  const notBefore = toFiniteNumber(payload.notBefore)
  const expiresAt = toFiniteNumber(payload.expiresAt)

  if (typeof notBefore === 'number' && nowSeconds < notBefore) {
    return {
      lane: 'fallback',
      parserErrorCode: 'token_not_active',
      message: 'Signed engine token is not active yet.',
    }
  }

  if (typeof expiresAt === 'number' && expiresAt <= nowSeconds) {
    return {
      lane: 'fallback',
      parserErrorCode: 'token_expired',
      message: 'Signed engine token has expired.',
    }
  }

  const engineId = toNonEmptyString(reference.engineId)
  if (!engineId) {
    return {
      lane: 'fallback',
      parserErrorCode: 'invalid_engine_payload',
      message: 'Signed ref payload is missing reference.engineId.',
    }
  }

  const metadata = asRecord(payload.metadata)
  const metadataAction = metadata ? metadata.legacyAction : undefined
  const action = isDataMatrixAction(metadataAction) ? metadataAction : undefined
  const deterministicMessage =
    toNonEmptyString(metadata?.deterministicMessage) ??
    (action
      ? `Deterministic action "${action.action}" accepted.`
      : `Deterministic engine "${engineId}" accepted.`)

  return {
    lane: 'deterministic',
    message: deterministicMessage,
    action,
  }
}

function extractSignedEnvelope(
  payload: unknown,
): NativeSignedTokenEnvelope | null {
  const record = asRecord(payload)
  if (!record) {
    return null
  }

  const nested =
    asRecord(record.qrSignedRef) ??
    asRecord(record.signedRef) ??
    asRecord(record.engineSignedRef) ??
    null
  if (nested) {
    return {
      payload: nested.payload as string | Record<string, unknown>,
      signature: toNonEmptyString(nested.signature),
      protected: toNonEmptyString(nested.protected),
    }
  }

  if (record.payload && record.signature) {
    return {
      payload: record.payload as string | Record<string, unknown>,
      signature: toNonEmptyString(record.signature),
      protected: toNonEmptyString(record.protected),
    }
  }

  return null
}

function decodePayloadCandidate(payload: string | Record<string, unknown>):
  | { ok: true; value: Record<string, unknown> }
  | {
      ok: false
      code: Extract<
        DataMatrixNativeParserErrorCode,
        'invalid_signed_payload' | 'invalid_engine_payload'
      >
      message: string
    } {
  if (typeof payload === 'string') {
    const decoded = decodeBase64Url(payload)
    if (!decoded) {
      return {
        ok: false,
        code: 'invalid_signed_payload',
        message: 'Signed payload is not valid base64url JSON.',
      }
    }

    try {
      const parsed = JSON.parse(decoded)
      const normalized = asRecord(parsed)
      if (!normalized) {
        return {
          ok: false,
          code: 'invalid_engine_payload',
          message: 'Signed payload JSON must be an object.',
        }
      }
      return {
        ok: true,
        value: normalized,
      }
    } catch {
      return {
        ok: false,
        code: 'invalid_signed_payload',
        message: 'Signed payload is not valid JSON after decoding.',
      }
    }
  }

  const normalized = asRecord(payload)
  if (!normalized) {
    return {
      ok: false,
      code: 'invalid_engine_payload',
      message: 'Signed payload must be an object.',
    }
  }

  return {
    ok: true,
    value: normalized,
  }
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(padded)
    }
    if (typeof globalThis.Buffer !== 'undefined') {
      return globalThis.Buffer.from(padded, 'base64').toString('utf8')
    }
    return null
  } catch {
    return null
  }
}

function isSupportedEngineVersion(version: string): boolean {
  const normalized = version.trim().toLowerCase()
  return normalized === '2' || normalized.startsWith('2.')
}

function isDataMatrixAction(value: unknown): value is DataMatrixAction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as DataMatrixAction
  return (
    typeof candidate.version === 'string' &&
    typeof candidate.action === 'string'
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
