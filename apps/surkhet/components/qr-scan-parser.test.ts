import { describe, expect, it } from 'vitest'
import { parseNativeScan } from './qr-scan-parser'

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createSignedRefEnvelope(
  nowSeconds: number,
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    payload: {
      tokenVersion: '2',
      payloadVersion: '2',
      reference: {
        businessId: 'biz-1',
        engineId: 'engine-1',
        engineVersion: 'v1',
      },
      nonce: 'nonce-12345678',
      issuedAt: nowSeconds - 60,
      expiresAt: nowSeconds + 60,
      ...overrides,
    },
    signature: 'signature-ok',
  })
}

describe('parseNativeScan', () => {
  it('returns empty_scan for empty payloads', () => {
    const route = parseNativeScan('')

    expect(route.lane).toBe('fallback')
    if (route.lane !== 'fallback') return

    expect(route.parserErrorCode).toBe('empty_scan')
    expect(route.suppressed).toBe(true)
  })

  it('returns invalid_json for malformed json payloads', () => {
    const route = parseNativeScan('{invalid-json')

    expect(route.lane).toBe('fallback')
    if (route.lane !== 'fallback') return

    expect(route.parserErrorCode).toBe('invalid_json')
    expect(route.showInvalidJsonAlert).toBe(true)
  })

  it('parses compact signed tokens into deterministic lane', () => {
    const payload = toBase64Url(
      JSON.stringify({
        version: '2.1',
        engineId: 'engine-compact-1',
        deterministicMessage: 'Compact token accepted.',
      }),
    )

    const route = parseNativeScan(`dm2:${payload}.signature-ok`)

    expect(route.lane).toBe('deterministic')
    if (route.lane !== 'deterministic') return

    expect(route.message).toContain('Compact token accepted')
  })

  it('returns token_not_active for signed-ref payload before notBefore', () => {
    const nowSeconds = 1_700_000_000
    const route = parseNativeScan(
      createSignedRefEnvelope(nowSeconds, {
        notBefore: nowSeconds + 120,
      }),
      { nowSeconds },
    )

    expect(route.lane).toBe('fallback')
    if (route.lane !== 'fallback') return

    expect(route.parserErrorCode).toBe('token_not_active')
  })

  it('returns token_expired for signed-ref payload after expiry', () => {
    const nowSeconds = 1_700_000_000
    const route = parseNativeScan(
      createSignedRefEnvelope(nowSeconds, {
        expiresAt: nowSeconds - 1,
      }),
      { nowSeconds },
    )

    expect(route.lane).toBe('fallback')
    if (route.lane !== 'fallback') return

    expect(route.parserErrorCode).toBe('token_expired')
  })
})
