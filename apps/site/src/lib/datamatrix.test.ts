import { describe, expect, it } from 'vitest';
import {
  dataMatrixActionSchema,
  parseQrEngineDefinition,
  parseQrSignedRefPayload,
  parseQrSignedRefToken,
  parseQrSignedRefTokenFromString,
  QR_ENGINE_DEFINITION_SCHEMA_VERSION,
  QR_SIGNED_REF_PAYLOAD_VERSION,
  QR_SIGNED_REF_TOKEN_VERSION,
  qrLocationPolicySchema,
  qrRetryClassSchema,
} from './datamatrix';

const FIXED_NOW_SECONDS = 1_700_000_000;

function createValidEngineDefinition() {
  return {
    schemaVersion: QR_ENGINE_DEFINITION_SCHEMA_VERSION,
    engineId: 'engine-demo',
    engineVersion: '2026.02.26',
    businessId: 'business-demo',
    entryNodeId: 'node-start',
    nodes: [
      {
        nodeId: 'node-start',
        kind: 'action' as const,
        actionId: 'navigate',
      },
    ],
    edges: [],
  };
}

function createValidSignedRefToken() {
  return {
    payload: {
      tokenVersion: QR_SIGNED_REF_TOKEN_VERSION,
      payloadVersion: QR_SIGNED_REF_PAYLOAD_VERSION,
      issuedAt: FIXED_NOW_SECONDS - 60,
      expiresAt: FIXED_NOW_SECONDS + 600,
      nonce: 'nonce-12345678',
      reference: {
        businessId: 'business-demo',
        engineId: 'engine-demo',
        engineVersion: '2026.02.26',
      },
    },
    signature: '0123456789abcdef0123456789abcdef',
    signatureAlgorithm: 'HS256' as const,
  };
}

describe('DataMatrix v2 core schema contracts', () => {
  it('parses location policy defaults', () => {
    const parsed = qrLocationPolicySchema.parse({});
    expect(parsed).toEqual(
      expect.objectContaining({
        mode: 'balanced',
        allowPartialExecution: true,
      }),
    );
  });

  it('accepts supported retry classes and rejects unsupported values', () => {
    expect(qrRetryClassSchema.safeParse('device_bridge').success).toBe(true);
    expect(qrRetryClassSchema.safeParse('legacy').success).toBe(false);
  });

  it('parses a valid engine definition and applies defaults', () => {
    const result = parseQrEngineDefinition(createValidEngineDefinition());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.lane).toBe('deterministic');
    expect(result.value.defaultRetryClass).toBe('interactive_fast_fail');
    expect(result.value.locationPolicy.mode).toBe('balanced');
  });

  it('fails engine definition parsing for unsupported schema version', () => {
    const result = parseQrEngineDefinition(createValidEngineDefinition(), {
      expectedSchemaVersion: '99',
    });
    expect(result).toEqual({
      ok: false,
      code: 'unsupported-engine-schema-version',
    });
  });

  it('parses a valid signed reference token', () => {
    const result = parseQrSignedRefToken(createValidSignedRefToken(), {
      nowSeconds: FIXED_NOW_SECONDS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.payload.tokenVersion).toBe(QR_SIGNED_REF_TOKEN_VERSION);
    expect(result.value.payload.payloadVersion).toBe(
      QR_SIGNED_REF_PAYLOAD_VERSION,
    );
    expect(result.value.payload.lane).toBe('deterministic');
  });

  it('fails signed token parsing when raw input is not JSON', () => {
    const result = parseQrSignedRefTokenFromString('not-json');
    expect(result).toEqual({
      ok: false,
      code: 'invalid-json',
    });
  });

  it('fails signed token parsing for unsupported token version', () => {
    const token = createValidSignedRefToken();
    token.payload.tokenVersion = '1';

    const result = parseQrSignedRefToken(token, {
      nowSeconds: FIXED_NOW_SECONDS,
    });
    expect(result).toEqual({
      ok: false,
      code: 'unsupported-token-version',
    });
  });

  it('fails signed payload parsing when token has expired', () => {
    const payload = createValidSignedRefToken().payload;
    payload.expiresAt = FIXED_NOW_SECONDS - 1;

    const result = parseQrSignedRefPayload(payload, {
      nowSeconds: FIXED_NOW_SECONDS,
    });
    expect(result).toEqual({
      ok: false,
      code: 'token-expired',
    });
  });

  it('fails signed payload parsing when token is not active yet', () => {
    const payload = {
      ...createValidSignedRefToken().payload,
      notBefore: FIXED_NOW_SECONDS + 120,
    };

    const result = parseQrSignedRefPayload(payload, {
      nowSeconds: FIXED_NOW_SECONDS,
    });
    expect(result).toEqual({
      ok: false,
      code: 'token-not-active',
    });
  });

  it('keeps legacy action payload parsing compatible', () => {
    const legacy = dataMatrixActionSchema.parse({
      action: 'navigate',
      navigation: {
        url: 'https://supersurkhet.com',
      },
    });

    expect(legacy.version).toBe('1.0');
    expect(legacy.action).toBe('navigate');
    expect(legacy.navigation?.url).toBe('https://supersurkhet.com');
  });
});
