import { describe, expect, it } from 'vitest';
import {
  handleAuthSessionRequest,
  handleProviderAuthMethodsRequest,
  handleProviderCredentialRequest,
  handleProviderOauthAuthorizeRequest,
  handleProviderOauthCallbackRequest,
} from './provider-auth-api';
import {
  decodeAiAuthSessionToken,
  decryptProviderCredentialStore,
  parseCookieHeader,
} from './provider-auth-store';

const secret = 'test-secret-for-provider-auth-api';
const authCookie = 'gun-user=%7B%22pub%22%3A%22test-user%22%7D';

function extractCookieValue(setCookieHeader: string | null): string {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0] ?? '';
}

describe('provider auth api', () => {
  it('stores provider credentials and creates auth sessions', async () => {
    const postCredentialResponse = await handleProviderCredentialRequest(
      new Request('http://localhost/v1/auth/providers', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'openai',
          model: 'gpt-5-mini',
          authMode: 'api-key',
          apiKey: 'sk-test',
        }),
      }),
      { secret, now: () => 1000 },
    );

    expect(postCredentialResponse.status).toBe(200);
    const storeCookie = extractCookieValue(
      postCredentialResponse.headers.get('set-cookie'),
    );
    expect(storeCookie.startsWith('ss-ai-provider-store=')).toBe(true);

    const listResponse = await handleProviderCredentialRequest(
      new Request('http://localhost/v1/auth/providers', {
        method: 'GET',
        headers: {
          cookie: `${authCookie}; ${storeCookie}`,
        },
      }),
      { secret, now: () => 1001 },
    );
    const listJson = (await listResponse.json()) as {
      data: Array<{ providerId: string }>;
    };

    expect(listResponse.status).toBe(200);
    expect(listJson.data[0]?.providerId).toBe('openai');

    const createSessionResponse = await handleAuthSessionRequest(
      new Request('http://localhost/v1/auth/sessions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${storeCookie}`,
        },
        body: JSON.stringify({
          providerId: 'openai',
          ttlSeconds: 300,
        }),
      }),
      { secret, now: () => 1005 },
    );
    const createdSession = (await createSessionResponse.json()) as {
      sessionToken: string;
    };

    expect(createSessionResponse.status).toBe(200);
    expect(createdSession.sessionToken.length).toBeGreaterThan(10);

    const introspectResponse = await handleAuthSessionRequest(
      new Request('http://localhost/v1/auth/sessions', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${createdSession.sessionToken}`,
        },
      }),
      { secret, now: () => 1010 },
    );
    const introspectJson = (await introspectResponse.json()) as {
      providerId: string;
    };

    expect(introspectResponse.status).toBe(200);
    expect(introspectJson.providerId).toBe('openai');
  });

  it('rejects credential writes without app auth cookie', async () => {
    const response = await handleProviderCredentialRequest(
      new Request('http://localhost/v1/auth/providers', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          providerId: 'openai',
          model: 'gpt-5-mini',
          authMode: 'api-key',
          apiKey: 'sk-test',
        }),
      }),
      { secret, now: () => 1000 },
    );

    expect(response.status).toBe(401);
  });

  it('returns provider auth methods including OpenAI subscription OAuth', async () => {
    const response = await handleProviderAuthMethodsRequest(
      new Request(
        'http://localhost/v1/auth/providers/methods?providerId=openai',
        {
          method: 'GET',
        },
      ),
    );
    const payload = (await response.json()) as {
      methods: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(
      payload.methods.some(
        (method) => method.id === 'openai-chatgpt-pro-plus-browser',
      ),
    ).toBe(true);
    expect(
      payload.methods.some(
        (method) => method.id === 'openai-chatgpt-pro-plus-headless',
      ),
    ).toBe(true);
    expect(payload.methods.some((method) => method.id === 'api-key')).toBe(
      true,
    );
  });

  it('returns provider auth methods for openrouter and github copilot oauth flows', async () => {
    const [openrouterResponse, copilotResponse] = await Promise.all([
      handleProviderAuthMethodsRequest(
        new Request(
          'http://localhost/v1/auth/providers/methods?providerId=openrouter',
          {
            method: 'GET',
          },
        ),
      ),
      handleProviderAuthMethodsRequest(
        new Request(
          'http://localhost/v1/auth/providers/methods?providerId=github-copilot',
          {
            method: 'GET',
          },
        ),
      ),
    ]);

    expect(openrouterResponse.status).toBe(200);
    const openrouterPayload = (await openrouterResponse.json()) as {
      methods: Array<{ id: string }>;
    };
    expect(
      openrouterPayload.methods.some(
        (method) => method.id === 'openrouter-account-oauth',
      ),
    ).toBe(true);

    expect(copilotResponse.status).toBe(200);
    const copilotPayload = (await copilotResponse.json()) as {
      methods: Array<{ id: string }>;
    };
    expect(
      copilotPayload.methods.some(
        (method) => method.id === 'github-copilot-device-oauth',
      ),
    ).toBe(true);
  });

  it('exposes and completes opencode oauth flow when opencode oauth env is configured', async () => {
    const previousAuthorizeEndpoint =
      process.env.OPENCODE_OAUTH_AUTHORIZE_ENDPOINT;
    const previousTokenEndpoint = process.env.OPENCODE_OAUTH_TOKEN_ENDPOINT;
    const previousClientId = process.env.OPENCODE_OAUTH_CLIENT_ID;

    process.env.OPENCODE_OAUTH_AUTHORIZE_ENDPOINT =
      'https://opencode.test/oauth/authorize';
    process.env.OPENCODE_OAUTH_TOKEN_ENDPOINT =
      'https://opencode.test/oauth/token';
    process.env.OPENCODE_OAUTH_CLIENT_ID = 'opencode-test-client-id';

    try {
      const methodsResponse = await handleProviderAuthMethodsRequest(
        new Request(
          'http://localhost/v1/auth/providers/methods?providerId=opencode',
          {
            method: 'GET',
          },
        ),
      );
      expect(methodsResponse.status).toBe(200);
      const methodsPayload = (await methodsResponse.json()) as {
        methods: Array<{ id: string }>;
      };
      expect(
        methodsPayload.methods.some(
          (method) => method.id === 'opencode-account-oauth',
        ),
      ).toBe(true);

      const authorizeResponse = await handleProviderOauthAuthorizeRequest(
        new Request('http://localhost/v1/auth/providers/oauth/authorize', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: authCookie,
          },
          body: JSON.stringify({
            providerId: 'opencode',
            methodId: 'opencode-account-oauth',
            model: 'gpt-5.2-codex',
          }),
        }),
        { secret, now: () => 2290 },
      );

      expect(authorizeResponse.status).toBe(200);
      const authorizeJson = (await authorizeResponse.json()) as {
        authorizationUrl: string;
        method: string;
      };
      expect(authorizeJson.method).toBe('opencode-account-oauth');
      expect(authorizeJson.authorizationUrl).toContain(
        'opencode.test/oauth/authorize',
      );

      const authorizeUrl = new URL(authorizeJson.authorizationUrl);
      const state = authorizeUrl.searchParams.get('state');
      expect(state).toBeTruthy();
      const oauthCookie = extractCookieValue(
        authorizeResponse.headers.get('set-cookie'),
      );

      const callbackResponse = await handleProviderOauthCallbackRequest(
        new Request('http://localhost/v1/auth/providers/oauth/callback', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: `${authCookie}; ${oauthCookie}`,
          },
          body: JSON.stringify({
            code: 'opencode-oauth-code',
            state,
          }),
        }),
        {
          secret,
          now: () => 2295,
          fetch: async (input) => {
            if (String(input).includes('opencode.test/oauth/token')) {
              return new Response(
                JSON.stringify({
                  access_token: 'opencode-access-token',
                  refresh_token: 'opencode-refresh-token',
                  expires_in: 3600,
                }),
                {
                  status: 200,
                  headers: {
                    'content-type': 'application/json',
                  },
                },
              );
            }
            return new Response('unexpected', { status: 500 });
          },
        },
      );

      expect(callbackResponse.status).toBe(200);
      const callbackJson = (await callbackResponse.json()) as {
        providerId: string;
        method: string;
        data: {
          providerId: string;
          authMode: string;
          hasOauthAccessToken: boolean;
          hasOauthRefreshToken: boolean;
        };
      };
      expect(callbackJson.providerId).toBe('opencode');
      expect(callbackJson.method).toBe('opencode-account-oauth');
      expect(callbackJson.data.providerId).toBe('opencode');
      expect(callbackJson.data.authMode).toBe('oauth-access-token');
      expect(callbackJson.data.hasOauthAccessToken).toBe(true);
      expect(callbackJson.data.hasOauthRefreshToken).toBe(true);
    } finally {
      if (typeof previousAuthorizeEndpoint === 'string') {
        process.env.OPENCODE_OAUTH_AUTHORIZE_ENDPOINT =
          previousAuthorizeEndpoint;
      } else {
        delete process.env.OPENCODE_OAUTH_AUTHORIZE_ENDPOINT;
      }
      if (typeof previousTokenEndpoint === 'string') {
        process.env.OPENCODE_OAUTH_TOKEN_ENDPOINT = previousTokenEndpoint;
      } else {
        delete process.env.OPENCODE_OAUTH_TOKEN_ENDPOINT;
      }
      if (typeof previousClientId === 'string') {
        process.env.OPENCODE_OAUTH_CLIENT_ID = previousClientId;
      } else {
        delete process.env.OPENCODE_OAUTH_CLIENT_ID;
      }
    }
  });

  it('creates oauth authorize state and stores openai credential on callback', async () => {
    const authorizeResponse = await handleProviderOauthAuthorizeRequest(
      new Request('http://localhost/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'openai',
          model: 'gpt-5-mini',
        }),
      }),
      { secret, now: () => 2000 },
    );

    expect(authorizeResponse.status).toBe(200);
    const authorizeJson = (await authorizeResponse.json()) as {
      authorizationUrl: string;
    };
    expect(authorizeJson.authorizationUrl).toContain(
      'auth.openai.com/oauth/authorize',
    );
    const oauthCookie = extractCookieValue(
      authorizeResponse.headers.get('set-cookie'),
    );
    expect(oauthCookie.startsWith('ss-ai-provider-oauth-state=')).toBe(true);

    const authorizeUrl = new URL(authorizeJson.authorizationUrl);
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toBeTruthy();

    const callbackResponse = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({
          code: 'test-oauth-code',
          state,
        }),
      }),
      {
        secret,
        now: () => 2005,
        fetch: async () =>
          new Response(
            JSON.stringify({
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              expires_in: 3600,
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          ),
      },
    );

    const callbackJson = (await callbackResponse.json()) as {
      data: { providerId: string; authMode: string };
    };
    expect(callbackResponse.status).toBe(200);
    expect(callbackJson.data.providerId).toBe('openai');
    expect(callbackJson.data.authMode).toBe('oauth-access-token');
  });

  it('supports openai headless device oauth polling callback', async () => {
    const authorizeResponse = await handleProviderOauthAuthorizeRequest(
      new Request('http://localhost/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'openai',
          methodId: 'openai-chatgpt-pro-plus-headless',
          model: 'gpt-5-mini',
        }),
      }),
      {
        secret,
        now: () => 2100,
        fetch: async (input) => {
          if (String(input).includes('/api/accounts/deviceauth/usercode')) {
            return new Response(
              JSON.stringify({
                device_auth_id: 'device-auth-id',
                user_code: 'USER-CODE-123',
                interval: '4',
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(authorizeResponse.status).toBe(200);
    const authorizeJson = (await authorizeResponse.json()) as {
      method: string;
      verificationCode?: string;
      pollingIntervalSeconds?: number;
    };
    expect(authorizeJson.method).toBe('openai-chatgpt-pro-plus-headless');
    expect(authorizeJson.verificationCode).toBe('USER-CODE-123');
    expect(authorizeJson.pollingIntervalSeconds).toBe(4);
    const oauthCookie = extractCookieValue(
      authorizeResponse.headers.get('set-cookie'),
    );

    let deviceTokenPollCount = 0;
    const pendingCallback = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({}),
      }),
      {
        secret,
        now: () => 2101,
        fetch: async (input) => {
          if (String(input).includes('/api/accounts/deviceauth/token')) {
            deviceTokenPollCount += 1;
            return new Response('', {
              status: 403,
            });
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(pendingCallback.status).toBe(202);
    const pendingJson = (await pendingCallback.json()) as {
      status?: string;
      retryAfterSeconds?: number;
    };
    expect(pendingJson.status).toBe('pending');
    expect(pendingJson.retryAfterSeconds).toBe(4);
    expect(deviceTokenPollCount).toBe(1);

    const successCallback = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({}),
      }),
      {
        secret,
        now: () => 2105,
        fetch: async (input) => {
          const url = String(input);
          if (url.includes('/api/accounts/deviceauth/token')) {
            return new Response(
              JSON.stringify({
                authorization_code: 'auth-code',
                code_verifier: 'pkce-verifier',
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          if (url.includes('/oauth/token')) {
            return new Response(
              JSON.stringify({
                access_token: 'headless-access-token',
                refresh_token: 'headless-refresh-token',
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(successCallback.status).toBe(200);
    const successJson = (await successCallback.json()) as {
      providerId: string;
      method: string;
      data: { authMode: string };
    };
    expect(successJson.providerId).toBe('openai');
    expect(successJson.method).toBe('openai-chatgpt-pro-plus-headless');
    expect(successJson.data.authMode).toBe('oauth-access-token');
  });

  it('creates google antigravity oauth state and stores google credential on callback', async () => {
    const previousClientId = process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID;
    const previousClientSecret = process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET;

    process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID = 'google-test-client-id';
    process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET = 'google-test-client-secret';

    try {
      const authorizeResponse = await handleProviderOauthAuthorizeRequest(
        new Request('http://localhost/v1/auth/providers/oauth/authorize', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: authCookie,
          },
          body: JSON.stringify({
            providerId: 'google',
            methodId: 'google-antigravity-oauth',
            model: 'gemini-2.5-flash',
            projectId: 'my-project',
          }),
        }),
        { secret, now: () => 2200 },
      );

      expect(authorizeResponse.status).toBe(200);
      const authorizeJson = (await authorizeResponse.json()) as {
        authorizationUrl: string;
        method: string;
      };
      expect(authorizeJson.method).toBe('google-antigravity-oauth');
      expect(authorizeJson.authorizationUrl).toContain(
        'accounts.google.com/o/oauth2/v2/auth',
      );
      const authorizeUrl = new URL(authorizeJson.authorizationUrl);
      const state = authorizeUrl.searchParams.get('state');
      expect(state).toBeTruthy();
      const oauthCookie = extractCookieValue(
        authorizeResponse.headers.get('set-cookie'),
      );

      const callbackResponse = await handleProviderOauthCallbackRequest(
        new Request('http://localhost/v1/auth/providers/oauth/callback', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: `${authCookie}; ${oauthCookie}`,
          },
          body: JSON.stringify({
            code: 'google-oauth-code',
            state,
          }),
        }),
        {
          secret,
          now: () => 2205,
          fetch: async (input) => {
            const url = String(input);
            if (url.includes('oauth2.googleapis.com/token')) {
              return new Response(
                JSON.stringify({
                  access_token: 'google-access-token',
                  refresh_token: 'google-refresh-token',
                  expires_in: 3600,
                }),
                {
                  status: 200,
                  headers: {
                    'content-type': 'application/json',
                  },
                },
              );
            }
            if (url.includes('googleapis.com/oauth2/v1/userinfo')) {
              return new Response(
                JSON.stringify({
                  email: 'user@example.com',
                }),
                {
                  status: 200,
                  headers: {
                    'content-type': 'application/json',
                  },
                },
              );
            }
            if (url.includes('v1internal:loadCodeAssist')) {
              return new Response(
                JSON.stringify({
                  cloudaicompanionProject: 'resolved-google-project',
                }),
                {
                  status: 200,
                  headers: {
                    'content-type': 'application/json',
                  },
                },
              );
            }
            return new Response('unexpected', { status: 500 });
          },
        },
      );

      expect(callbackResponse.status).toBe(200);
      const callbackJson = (await callbackResponse.json()) as {
        providerId: string;
        method: string;
        data: {
          providerId: string;
          authMode: string;
          hasOauthAccessToken: boolean;
        };
      };
      expect(callbackJson.providerId).toBe('google');
      expect(callbackJson.method).toBe('google-antigravity-oauth');
      expect(callbackJson.data.providerId).toBe('google');
      expect(callbackJson.data.authMode).toBe('oauth-access-token');
      expect(callbackJson.data.hasOauthAccessToken).toBe(true);
    } finally {
      if (typeof previousClientId === 'string') {
        process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID = previousClientId;
      } else {
        delete process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID;
      }
      if (typeof previousClientSecret === 'string') {
        process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET = previousClientSecret;
      } else {
        delete process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET;
      }
    }
  });

  it('creates openrouter oauth state and stores openrouter credential on callback', async () => {
    const authorizeResponse = await handleProviderOauthAuthorizeRequest(
      new Request('http://localhost/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'openrouter',
          methodId: 'openrouter-account-oauth',
          model: 'openai/gpt-5',
        }),
      }),
      {
        secret,
        now: () => 2300,
        fetch: async () => new Response('unexpected', { status: 500 }),
      },
    );

    expect(authorizeResponse.status).toBe(200);
    const authorizeJson = (await authorizeResponse.json()) as {
      authorizationUrl: string;
      method: string;
    };
    expect(authorizeJson.method).toBe('openrouter-account-oauth');
    expect(authorizeJson.authorizationUrl).toContain('openrouter.ai/auth');

    const authorizeUrl = new URL(authorizeJson.authorizationUrl);
    const state = authorizeUrl.searchParams.get('state');
    expect(state).toBeTruthy();
    const oauthCookie = extractCookieValue(
      authorizeResponse.headers.get('set-cookie'),
    );

    const callbackResponse = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({
          code: 'openrouter-code',
          state,
        }),
      }),
      {
        secret,
        now: () => 2305,
        fetch: async (input) => {
          if (String(input).includes('/api/v1/auth/keys')) {
            return new Response(
              JSON.stringify({
                key: 'test_openrouter_key',
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );

    expect(callbackResponse.status).toBe(200);
    const callbackJson = (await callbackResponse.json()) as {
      providerId: string;
      method: string;
      data: {
        providerId: string;
        authMode: string;
        hasOauthAccessToken: boolean;
      };
    };
    expect(callbackJson.providerId).toBe('openrouter');
    expect(callbackJson.method).toBe('openrouter-account-oauth');
    expect(callbackJson.data.providerId).toBe('openrouter');
    expect(callbackJson.data.authMode).toBe('oauth-access-token');
    expect(callbackJson.data.hasOauthAccessToken).toBe(true);
  });

  it('supports github copilot device oauth polling callback', async () => {
    const authorizeResponse = await handleProviderOauthAuthorizeRequest(
      new Request('http://localhost/v1/auth/providers/oauth/authorize', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'github-copilot',
          methodId: 'github-copilot-device-oauth',
          model: 'gpt-4.1',
        }),
      }),
      {
        secret,
        now: () => 2400,
        fetch: async (input) => {
          if (String(input).includes('/login/device/code')) {
            return new Response(
              JSON.stringify({
                verification_uri: 'https://github.com/login/device',
                user_code: 'GH-CODE-123',
                device_code: 'device-code-123',
                interval: 4,
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(authorizeResponse.status).toBe(200);
    const authorizeJson = (await authorizeResponse.json()) as {
      method: string;
      verificationCode?: string;
      pollingIntervalSeconds?: number;
    };
    expect(authorizeJson.method).toBe('github-copilot-device-oauth');
    expect(authorizeJson.verificationCode).toBe('GH-CODE-123');
    expect(authorizeJson.pollingIntervalSeconds).toBe(4);

    const oauthCookie = extractCookieValue(
      authorizeResponse.headers.get('set-cookie'),
    );

    const pendingCallback = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({}),
      }),
      {
        secret,
        now: () => 2401,
        fetch: async (input) => {
          if (String(input).includes('/login/oauth/access_token')) {
            return new Response(
              JSON.stringify({
                error: 'authorization_pending',
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(pendingCallback.status).toBe(202);
    const pendingJson = (await pendingCallback.json()) as {
      providerId?: string;
      status?: string;
      retryAfterSeconds?: number;
    };
    expect(pendingJson.providerId).toBe('github-copilot');
    expect(pendingJson.status).toBe('pending');
    expect(pendingJson.retryAfterSeconds).toBe(4);

    const successCallback = await handleProviderOauthCallbackRequest(
      new Request('http://localhost/v1/auth/providers/oauth/callback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${oauthCookie}`,
        },
        body: JSON.stringify({}),
      }),
      {
        secret,
        now: () => 2405,
        fetch: async (input) => {
          if (String(input).includes('/login/oauth/access_token')) {
            return new Response(
              JSON.stringify({
                access_token: 'ghu_copilot_access_token',
              }),
              {
                status: 200,
                headers: {
                  'content-type': 'application/json',
                },
              },
            );
          }
          return new Response('unexpected', { status: 500 });
        },
      },
    );
    expect(successCallback.status).toBe(200);
    const successJson = (await successCallback.json()) as {
      providerId: string;
      method: string;
      data: { authMode: string; hasOauthAccessToken: boolean };
    };
    expect(successJson.providerId).toBe('github-copilot');
    expect(successJson.method).toBe('github-copilot-device-oauth');
    expect(successJson.data.authMode).toBe('oauth-access-token');
    expect(successJson.data.hasOauthAccessToken).toBe(true);
  });

  it('refreshes expired openai oauth credentials when creating an auth session', async () => {
    const postCredentialResponse = await handleProviderCredentialRequest(
      new Request('http://localhost/v1/auth/providers', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
        },
        body: JSON.stringify({
          providerId: 'openai',
          model: 'gpt-5-mini',
          authMode: 'oauth-access-token',
          oauthAccessToken: 'expired-access-token',
          oauthRefreshToken: 'stored-refresh-token',
          oauthExpiresAt: 3000,
        }),
      }),
      { secret, now: () => 3010 },
    );
    const storeCookie = extractCookieValue(
      postCredentialResponse.headers.get('set-cookie'),
    );

    const createSessionResponse = await handleAuthSessionRequest(
      new Request('http://localhost/v1/auth/sessions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${authCookie}; ${storeCookie}`,
        },
        body: JSON.stringify({
          providerId: 'openai',
          ttlSeconds: 900,
        }),
      }),
      {
        secret,
        now: () => 4000,
        fetch: async () =>
          new Response(
            JSON.stringify({
              access_token: 'refreshed-access-token',
              refresh_token: 'rotated-refresh-token',
              expires_in: 7200,
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          ),
      },
    );
    expect(createSessionResponse.status).toBe(200);

    const createdSession = (await createSessionResponse.json()) as {
      sessionToken: string;
    };
    const decodedSession = decodeAiAuthSessionToken(
      createdSession.sessionToken,
      {
        secret,
        now: 4001,
      },
    );
    expect(decodedSession?.provider.oauthAccessToken).toBe(
      'refreshed-access-token',
    );
    expect(decodedSession?.provider.oauthRefreshToken).toBe(
      'rotated-refresh-token',
    );
    expect(decodedSession?.provider.oauthExpiresAt).toBe(11200);

    const refreshedStoreCookie = extractCookieValue(
      createSessionResponse.headers.get('set-cookie'),
    );
    expect(refreshedStoreCookie.startsWith('ss-ai-provider-store=')).toBe(true);

    const parsedCookie = parseCookieHeader(refreshedStoreCookie);
    const refreshedStore = decryptProviderCredentialStore(
      parsedCookie['ss-ai-provider-store'],
      secret,
    );
    expect(refreshedStore.openai?.[0]?.oauthAccessToken).toBe(
      'refreshed-access-token',
    );
    expect(refreshedStore.openai?.[0]?.oauthRefreshToken).toBe(
      'rotated-refresh-token',
    );
    expect(refreshedStore.openai?.[0]?.oauthExpiresAt).toBe(11200);
  });
});
