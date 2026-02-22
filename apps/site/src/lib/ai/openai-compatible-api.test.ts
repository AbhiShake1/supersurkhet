import { describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleApiHandlers } from './openai-compatible-api';
import {
  createAiAuthSessionToken,
  decodeAiAuthSessionToken,
  encryptProviderCredentialStore,
} from './provider-auth-store';

const secret = 'test-secret-for-openai-compatible';

describe('openai compatible api', () => {
  it('returns model list and chat completions for a valid session token', async () => {
    const sessionToken = createAiAuthSessionToken(
      {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'api-key',
        apiKey: 'sk-test',
      },
      {
        secret,
        now: 2000,
        ttlSeconds: 600,
      },
    );

    const handlers = createOpenAiCompatibleApiHandlers({
      secret,
      now: () => 2100,
      generateCompletion: async () => ({
        text: 'Mock completion text',
        usage: {
          inputTokens: 12,
          outputTokens: 4,
        },
      }),
    });

    const modelsResponse = await handlers.handleModelsRequest(
      new Request('http://localhost/v1/models', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      }),
    );
    const modelsJson = (await modelsResponse.json()) as {
      data: Array<{ id: string }>;
    };

    expect(modelsResponse.status).toBe(200);
    expect(modelsJson.data.some((model) => model.id === 'gpt-5-mini')).toBe(
      true,
    );

    const completionResponse = await handlers.handleChatCompletionsRequest(
      new Request('http://localhost/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'Hello there' }],
        }),
      }),
    );
    const completionJson = (await completionResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    expect(completionResponse.status).toBe(200);
    expect(completionJson.choices[0]?.message.content).toBe(
      'Mock completion text',
    );
    expect(completionJson.usage.prompt_tokens).toBe(12);
    expect(completionJson.usage.completion_tokens).toBe(4);
  });

  it('rejects stream=true requests when streaming is not enabled', async () => {
    const sessionToken = createAiAuthSessionToken(
      {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'api-key',
        apiKey: 'sk-test',
      },
      {
        secret,
        now: 2000,
        ttlSeconds: 600,
      },
    );

    const handlers = createOpenAiCompatibleApiHandlers({
      secret,
      now: () => 2100,
      generateCompletion: async () => ({
        text: 'unused',
      }),
    });

    const response = await handlers.handleChatCompletionsRequest(
      new Request('http://localhost/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          stream: true,
          messages: [{ role: 'user', content: 'hello' }],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it('refreshes expired openai oauth sessions for model listing and rotates token headers', async () => {
    const sessionToken = createAiAuthSessionToken(
      {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'oauth-access-token',
        oauthAccessToken: 'expired-access-token',
        oauthRefreshToken: 'stored-refresh-token',
        oauthExpiresAt: 1900,
        baseURL: 'https://chatgpt.com/backend-api/codex',
      },
      {
        secret,
        now: 1800,
        ttlSeconds: 3600,
      },
    );
    const encryptedStore = encryptProviderCredentialStore(
      {
        openai: {
          providerId: 'openai',
          model: 'gpt-5-mini',
          authMode: 'oauth-access-token',
          oauthAccessToken: 'expired-access-token',
          oauthRefreshToken: 'stored-refresh-token',
          oauthExpiresAt: 1900,
          baseURL: 'https://chatgpt.com/backend-api/codex',
          updatedAt: 1700,
        },
      },
      secret,
    );

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: 'refreshed-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const handlers = createOpenAiCompatibleApiHandlers({
        secret,
        now: () => 2100,
      });

      const modelsResponse = await handlers.handleModelsRequest(
        new Request('http://localhost/v1/models', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: `ss-ai-provider-store=${encodeURIComponent(encryptedStore)}`,
          },
        }),
      );
      expect(modelsResponse.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const rotatedSessionToken = modelsResponse.headers.get(
        'x-ai-auth-session-token',
      );
      expect(rotatedSessionToken).toBeTruthy();
      const rotatedSession = decodeAiAuthSessionToken(rotatedSessionToken, {
        secret,
        now: 2101,
      });
      expect(rotatedSession?.provider.oauthAccessToken).toBe(
        'refreshed-access-token',
      );
      expect(modelsResponse.headers.get('set-cookie')).toContain(
        'ss-ai-provider-store=',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refreshes expired openai oauth sessions before chat completions', async () => {
    const sessionToken = createAiAuthSessionToken(
      {
        providerId: 'openai',
        model: 'gpt-5-mini',
        authMode: 'oauth-access-token',
        oauthAccessToken: 'expired-access-token',
        oauthRefreshToken: 'stored-refresh-token',
        oauthExpiresAt: 1900,
        baseURL: 'https://chatgpt.com/backend-api/codex',
      },
      {
        secret,
        now: 1800,
        ttlSeconds: 3600,
      },
    );
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: 'refreshed-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const handlers = createOpenAiCompatibleApiHandlers({
        secret,
        now: () => 2100,
        generateCompletion: async ({ session }) => {
          expect(session.provider.oauthAccessToken).toBe(
            'refreshed-access-token',
          );
          return {
            text: 'Refreshed completion text',
            usage: {
              inputTokens: 5,
              outputTokens: 2,
            },
          };
        },
      });

      const completionResponse = await handlers.handleChatCompletionsRequest(
        new Request('http://localhost/chat/completions', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${sessionToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [{ role: 'user', content: 'hello' }],
          }),
        }),
      );

      expect(completionResponse.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        completionResponse.headers.get('x-ai-auth-session-token'),
      ).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refreshes expired google oauth sessions and rotates auth session token', async () => {
    const sessionToken = createAiAuthSessionToken(
      {
        providerId: 'google',
        model: 'gemini-2.5-flash',
        authMode: 'oauth-access-token',
        oauthAccessToken: 'expired-google-access-token',
        oauthRefreshToken: 'stored-google-refresh-token',
        oauthExpiresAt: 1800,
      },
      {
        secret,
        now: 1700,
        ttlSeconds: 3600,
      },
    );
    const encryptedStore = encryptProviderCredentialStore(
      {
        google: {
          providerId: 'google',
          model: 'gemini-2.5-flash',
          authMode: 'oauth-access-token',
          oauthAccessToken: 'expired-google-access-token',
          oauthRefreshToken: 'stored-google-refresh-token',
          oauthExpiresAt: 1800,
          updatedAt: 1650,
        },
      },
      secret,
    );

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: 'refreshed-google-access-token',
          refresh_token: 'rotated-google-refresh-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const handlers = createOpenAiCompatibleApiHandlers({
        secret,
        now: () => 2100,
      });

      const modelsResponse = await handlers.handleModelsRequest(
        new Request('http://localhost/v1/models', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${sessionToken}`,
            cookie: `ss-ai-provider-store=${encodeURIComponent(encryptedStore)}`,
          },
        }),
      );
      expect(modelsResponse.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const rotatedSessionToken = modelsResponse.headers.get(
        'x-ai-auth-session-token',
      );
      expect(rotatedSessionToken).toBeTruthy();
      const rotatedSession = decodeAiAuthSessionToken(rotatedSessionToken, {
        secret,
        now: 2101,
      });
      expect(rotatedSession?.provider.providerId).toBe('google');
      expect(rotatedSession?.provider.oauthAccessToken).toBe(
        'refreshed-google-access-token',
      );
      expect(rotatedSession?.provider.oauthRefreshToken).toBe(
        'rotated-google-refresh-token',
      );
      expect(modelsResponse.headers.get('set-cookie')).toContain(
        'ss-ai-provider-store=',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
