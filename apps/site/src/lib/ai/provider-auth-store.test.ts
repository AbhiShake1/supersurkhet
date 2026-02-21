import { describe, expect, it } from 'vitest';
import type { AssistantProviderConfig } from './business-onboarding-provider-runtime';
import {
  createAiAuthSessionToken,
  createProviderOauthStateToken,
  decodeAiAuthSessionToken,
  decodeProviderOauthStateToken,
  decryptProviderCredentialStore,
  encryptProviderCredentialStore,
} from './provider-auth-store';

const secret = 'test-secret-for-provider-store';

const openAiProvider: AssistantProviderConfig = {
  providerId: 'openai',
  model: 'gpt-5-mini',
  authMode: 'api-key',
  apiKey: 'sk-test-key',
};

describe('provider auth store', () => {
  it('encrypts and decrypts provider credential state', () => {
    const encrypted = encryptProviderCredentialStore(
      {
        openai: {
          ...openAiProvider,
          updatedAt: 1111,
        },
      },
      secret,
    );

    const decrypted = decryptProviderCredentialStore(encrypted, secret);

    expect(decrypted.openai?.providerId).toBe('openai');
    expect(decrypted.openai?.apiKey).toBe('sk-test-key');
    expect(decrypted.openai?.updatedAt).toBe(1111);
  });

  it('returns null for tampered session token', () => {
    const token = createAiAuthSessionToken(openAiProvider, {
      secret,
      now: 100,
      ttlSeconds: 300,
    });
    const tampered = `${token.slice(0, -2)}xx`;

    const decoded = decodeAiAuthSessionToken(tampered, {
      secret,
      now: 200,
    });

    expect(decoded).toBeNull();
  });

  it('expires session tokens after ttl', () => {
    const token = createAiAuthSessionToken(openAiProvider, {
      secret,
      now: 1000,
      ttlSeconds: 60,
    });

    const valid = decodeAiAuthSessionToken(token, {
      secret,
      now: 1050,
    });
    const expired = decodeAiAuthSessionToken(token, {
      secret,
      now: 1061,
    });

    expect(valid?.provider.providerId).toBe('openai');
    expect(expired).toBeNull();
  });

  it('encodes and decodes provider oauth state payload', () => {
    const token = createProviderOauthStateToken(
      {
        providerId: 'openai',
        state: 'state-1',
        verifier: 'verifier-1',
        redirectUri: 'http://localhost/callback',
        expiresAt: 2000,
      },
      secret,
    );

    const valid = decodeProviderOauthStateToken(token, {
      secret,
      now: 1900,
    });
    const expired = decodeProviderOauthStateToken(token, {
      secret,
      now: 2000,
    });

    expect(valid?.providerId).toBe('openai');
    expect(valid?.state).toBe('state-1');
    expect(expired).toBeNull();
  });
});
