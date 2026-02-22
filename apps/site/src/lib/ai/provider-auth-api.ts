import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  PROVIDER_SUPPORTED_AUTH_MODES,
  resolveProviderSupportedAuthModes,
} from './business-onboarding-models';
import {
  type AssistantProviderConfig,
  assistantProviderConfigSchema,
  assistantProviderIdSchema,
  normalizeAssistantProviderConfig,
} from './business-onboarding-provider-runtime';
import {
  pollGithubCopilotDeviceAuthorization,
  requestGithubCopilotDeviceAuthorization,
} from './github-copilot-oauth';
import {
  buildGoogleAntigravityAuthorizeUrl,
  exchangeGoogleAuthorizationCode,
  resolveGoogleAntigravityClientConfig,
  resolveGoogleOauthExpiresAt,
} from './google-antigravity-oauth';
import {
  exchangeOpenAiAuthorizationCode,
  extractOpenAiChatGptAccountId,
  OPENAI_OAUTH_CLIENT_ID,
  OPENAI_OAUTH_DEFAULT_BASE_URL,
  OPENAI_OAUTH_ISSUER,
  OPENAI_OAUTH_SCOPE,
  resolveOpenAiOauthExpiresAt,
} from './openai-oauth';
import {
  buildOpencodeAuthorizeUrl,
  exchangeOpencodeAuthorizationCode,
  isOpencodeOauthConfigured,
} from './opencode-oauth';
import {
  buildOpenRouterAuthorizeUrl,
  exchangeOpenRouterAuthorizationCode,
} from './openrouter-oauth';
import {
  buildProviderCredentialStoreSetCookie,
  buildProviderOauthStateClearCookie,
  buildProviderOauthStateSetCookie,
  createAiAuthSessionToken,
  decodeAiAuthSessionToken,
  extractBearerToken,
  type ProviderOauthStatePayload,
  parseCookieHeader,
  readProviderCredentialStoreFromRequest,
  readProviderOauthStateFromRequest,
  revokeAiAuthSessionToken,
  type StoredProviderCredential,
  sanitizeStoredProviderCredential,
} from './provider-auth-store';
import { refreshProviderCredentialIfNeeded } from './provider-oauth-refresh';

type HandlerOptions = {
  secret?: string;
  now?: () => number;
  fetch?: typeof fetch;
};

type ProviderAuthMethod = {
  id: string;
  type: 'api' | 'oauth';
  label: string;
};

const OPENAI_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OPENAI_CHATGPT_BROWSER_OAUTH_METHOD_ID =
  'openai-chatgpt-pro-plus-browser';
const OPENAI_CHATGPT_HEADLESS_OAUTH_METHOD_ID =
  'openai-chatgpt-pro-plus-headless';
const OPENAI_CHATGPT_LEGACY_OAUTH_METHOD_ID = 'openai-chatgpt-subscription';
const GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID = 'google-antigravity-oauth';
const OPENCODE_ACCOUNT_OAUTH_METHOD_ID = 'opencode-account-oauth';
const OPENROUTER_ACCOUNT_OAUTH_METHOD_ID = 'openrouter-account-oauth';
const GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID = 'github-copilot-device-oauth';
const OPENAI_DEVICE_AUTH_AUTHORIZE_URL = `${OPENAI_OAUTH_ISSUER}/api/accounts/deviceauth/usercode`;
const OPENAI_DEVICE_AUTH_TOKEN_URL = `${OPENAI_OAUTH_ISSUER}/api/accounts/deviceauth/token`;
const OPENAI_DEVICE_AUTH_REDIRECT_URI = `${OPENAI_OAUTH_ISSUER}/deviceauth/callback`;
const DEFAULT_OPENAI_DEVICE_AUTH_INTERVAL_SECONDS = 5;

const upsertProviderCredentialSchema = assistantProviderConfigSchema.extend({
  providerId: assistantProviderIdSchema,
});

const createSessionBodySchema = z.object({
  providerId: assistantProviderIdSchema.optional(),
  model: z.string().optional(),
  ttlSeconds: z.number().int().min(60).max(86400).optional(),
  provider: assistantProviderConfigSchema.optional(),
});

const providerAuthMethodsQuerySchema = z.object({
  providerId: assistantProviderIdSchema.optional(),
});

const providerOauthAuthorizeBodySchema = z.object({
  providerId: assistantProviderIdSchema.default('openai'),
  methodId: z.string().trim().min(1).optional(),
  model: z.string().optional(),
  returnTo: z.string().url().optional(),
  redirectUri: z.string().url().optional(),
  projectId: z.string().trim().optional(),
});

const providerOauthCallbackBodySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

function jsonResponse(
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    status,
  );
}

function htmlResponse(
  html: string,
  status = 200,
  cookies: string[] = [],
): Response {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
  });
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(html, {
    status,
    headers,
  });
}

function jsonResponseWithCookies(
  data: unknown,
  status = 200,
  cookies: string[] = [],
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((byte) => chars[byte % chars.length] ?? 'a')
    .join('');
}

function sha256Base64Url(value: string): string {
  return createHash('sha256')
    .update(value, 'utf8')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildOpenAiAuthorizeUrl(input: {
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OPENAI_OAUTH_CLIENT_ID,
    redirect_uri: input.redirectUri,
    scope: OPENAI_OAUTH_SCOPE,
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state: input.state,
    originator: 'supersurkhet',
  });
  return `${OPENAI_OAUTH_ISSUER}/oauth/authorize?${params.toString()}`;
}

async function requestOpenAiDeviceAuthorization(
  options: HandlerOptions,
): Promise<{
  deviceAuthId: string;
  userCode: string;
  intervalSeconds: number;
}> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(OPENAI_DEVICE_AUTH_AUTHORIZE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: OPENAI_OAUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI device authorization failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    device_auth_id?: unknown;
    user_code?: unknown;
    interval?: unknown;
  };
  const deviceAuthId =
    typeof payload.device_auth_id === 'string'
      ? payload.device_auth_id.trim()
      : '';
  const userCode =
    typeof payload.user_code === 'string' ? payload.user_code.trim() : '';
  const intervalSecondsRaw =
    typeof payload.interval === 'number'
      ? payload.interval
      : typeof payload.interval === 'string'
        ? Number.parseInt(payload.interval, 10)
        : DEFAULT_OPENAI_DEVICE_AUTH_INTERVAL_SECONDS;

  if (!deviceAuthId || !userCode) {
    throw new Error('OpenAI device authorization response is missing fields.');
  }

  return {
    deviceAuthId,
    userCode,
    intervalSeconds:
      Number.isFinite(intervalSecondsRaw) && intervalSecondsRaw > 0
        ? Math.floor(intervalSecondsRaw)
        : DEFAULT_OPENAI_DEVICE_AUTH_INTERVAL_SECONDS,
  };
}

async function pollOpenAiDeviceAuthorization(
  oauthState: ProviderOauthStatePayload,
  options: HandlerOptions,
): Promise<{
  pending: boolean;
  retryAfterSeconds: number;
  tokens?: Awaited<ReturnType<typeof exchangeOpenAiAuthorizationCode>>;
}> {
  const deviceAuthId = oauthState.openAiDeviceAuthId?.trim();
  const userCode = oauthState.openAiDeviceUserCode?.trim();
  const retryAfterSeconds =
    oauthState.openAiDeviceIntervalSeconds ??
    DEFAULT_OPENAI_DEVICE_AUTH_INTERVAL_SECONDS;

  if (!deviceAuthId || !userCode) {
    throw new Error('OAuth state is missing OpenAI device authorization data.');
  }

  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(OPENAI_DEVICE_AUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      device_auth_id: deviceAuthId,
      user_code: userCode,
    }),
  });

  if (response.status === 403 || response.status === 404) {
    return {
      pending: true,
      retryAfterSeconds,
    };
  }

  if (!response.ok) {
    throw new Error(
      `OpenAI device authorization polling failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    authorization_code?: unknown;
    code_verifier?: unknown;
  };
  const authorizationCode =
    typeof payload.authorization_code === 'string'
      ? payload.authorization_code.trim()
      : '';
  const codeVerifier =
    typeof payload.code_verifier === 'string'
      ? payload.code_verifier.trim()
      : '';
  if (!authorizationCode || !codeVerifier) {
    throw new Error(
      'OpenAI device authorization response is missing authorization_code or code_verifier.',
    );
  }

  const tokens = await exchangeOpenAiAuthorizationCode(
    authorizationCode,
    OPENAI_DEVICE_AUTH_REDIRECT_URI,
    codeVerifier,
    options,
  );

  return {
    pending: false,
    retryAfterSeconds,
    tokens,
  };
}

async function pollGithubCopilotDeviceOauth(
  oauthState: ProviderOauthStatePayload,
  options: HandlerOptions,
): Promise<{
  pending: boolean;
  retryAfterSeconds: number;
  accessToken?: string;
}> {
  const deviceCode = oauthState.githubCopilotDeviceCode?.trim();
  const fallbackIntervalSeconds =
    oauthState.githubCopilotIntervalSeconds ??
    DEFAULT_OPENAI_DEVICE_AUTH_INTERVAL_SECONDS;

  if (!deviceCode) {
    throw new Error(
      'OAuth state is missing GitHub Copilot device authorization data.',
    );
  }

  const result = await pollGithubCopilotDeviceAuthorization(
    {
      deviceCode,
      fallbackIntervalSeconds,
    },
    options,
  );

  if (result.pending) {
    return {
      pending: true,
      retryAfterSeconds: result.retryAfterSeconds,
    };
  }

  return {
    pending: false,
    retryAfterSeconds: result.retryAfterSeconds,
    accessToken: result.accessToken,
  };
}

function resolveRequestedOauthMethodId(
  providerId: string,
  requestedMethodId?: string,
): string | null {
  const methodId = requestedMethodId?.trim();

  if (providerId === 'openai') {
    if (!methodId) return OPENAI_CHATGPT_BROWSER_OAUTH_METHOD_ID;
    if (
      methodId === OPENAI_CHATGPT_BROWSER_OAUTH_METHOD_ID ||
      methodId === OPENAI_CHATGPT_HEADLESS_OAUTH_METHOD_ID ||
      methodId === OPENAI_CHATGPT_LEGACY_OAUTH_METHOD_ID
    ) {
      return methodId;
    }
    return null;
  }

  if (providerId === 'google') {
    if (!methodId) return GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID;
    if (methodId === GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID) {
      return methodId;
    }
    return null;
  }

  if (providerId === 'opencode') {
    if (!isOpencodeOauthConfigured()) return null;
    if (!methodId) return OPENCODE_ACCOUNT_OAUTH_METHOD_ID;
    if (methodId === OPENCODE_ACCOUNT_OAUTH_METHOD_ID) {
      return methodId;
    }
    return null;
  }

  if (providerId === 'openrouter') {
    if (!methodId) return OPENROUTER_ACCOUNT_OAUTH_METHOD_ID;
    if (methodId === OPENROUTER_ACCOUNT_OAUTH_METHOD_ID) {
      return methodId;
    }
    return null;
  }

  if (providerId === 'github-copilot') {
    if (!methodId) return GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID;
    if (methodId === GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID) {
      return methodId;
    }
    return null;
  }

  return null;
}

function isOpenAiBrowserOauthMethod(methodId?: string): boolean {
  return (
    methodId === OPENAI_CHATGPT_BROWSER_OAUTH_METHOD_ID ||
    methodId === OPENAI_CHATGPT_LEGACY_OAUTH_METHOD_ID
  );
}

function providerAuthMethodsForProvider(
  providerId: string,
): ProviderAuthMethod[] {
  const modes = resolveProviderSupportedAuthModes(providerId);
  const methods: ProviderAuthMethod[] = [];

  if (providerId === 'openai') {
    methods.push({
      id: OPENAI_CHATGPT_BROWSER_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'ChatGPT Plus/Pro (browser OAuth)',
    });
    methods.push({
      id: OPENAI_CHATGPT_HEADLESS_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'ChatGPT Plus/Pro (headless device OAuth)',
    });
    methods.push({
      id: OPENAI_CHATGPT_LEGACY_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'ChatGPT Plus/Pro subscription (OAuth legacy)',
    });
  }

  if (providerId === 'google') {
    methods.push({
      id: GOOGLE_ANTIGRAVITY_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'Google OAuth (Antigravity subscription)',
    });
  }

  if (providerId === 'opencode' && isOpencodeOauthConfigured()) {
    methods.push({
      id: OPENCODE_ACCOUNT_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'OpenCode account OAuth',
    });
  }

  if (providerId === 'openrouter') {
    methods.push({
      id: OPENROUTER_ACCOUNT_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'OpenRouter account OAuth',
    });
  }

  if (providerId === 'github-copilot') {
    methods.push({
      id: GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID,
      type: 'oauth',
      label: 'GitHub Copilot device OAuth',
    });
  }

  for (const mode of modes) {
    if (mode === 'api-key') {
      methods.push({
        id: 'api-key',
        type: 'api',
        label: 'API key',
      });
      continue;
    }
    if (mode === 'oauth-access-token') {
      methods.push({
        id: 'oauth-access-token',
        type: 'oauth',
        label: 'OAuth access token',
      });
      continue;
    }
    if (mode === 'aws-credential-chain') {
      methods.push({
        id: 'aws-credential-chain',
        type: 'api',
        label: 'AWS credential chain',
      });
      continue;
    }
    methods.push({
      id: 'none',
      type: 'api',
      label: 'No authentication',
    });
  }

  return methods;
}

function hasAppAuthCookie(request: Request): boolean {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return (
    typeof cookies['gun-user'] === 'string' && cookies['gun-user'].length > 0
  );
}

async function parseRequestJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema> | null> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function resolveNow(options?: HandlerOptions): number {
  return options?.now
    ? Math.floor(options.now())
    : Math.floor(Date.now() / 1000);
}

export async function handleProviderAuthMethodsRequest(
  request: Request,
): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== 'GET') {
    return errorResponse(405, `Method ${method} not allowed.`);
  }

  const url = new URL(request.url);
  const parsedQuery = providerAuthMethodsQuerySchema.safeParse({
    providerId: url.searchParams.get('providerId') ?? undefined,
  });
  if (!parsedQuery.success) {
    return errorResponse(400, 'Invalid provider auth methods query.');
  }

  if (parsedQuery.data.providerId) {
    return jsonResponse({
      providerId: parsedQuery.data.providerId,
      methods: providerAuthMethodsForProvider(parsedQuery.data.providerId),
    });
  }

  const methods = Object.fromEntries(
    Object.keys(PROVIDER_SUPPORTED_AUTH_MODES)
      .sort((a, b) => a.localeCompare(b))
      .map((providerId) => [
        providerId,
        providerAuthMethodsForProvider(providerId),
      ]),
  );

  return jsonResponse({
    object: 'provider_auth_methods',
    data: methods,
  });
}

export async function handleProviderOauthAuthorizeRequest(
  request: Request,
  options: HandlerOptions = {},
): Promise<Response> {
  if (!hasAppAuthCookie(request)) {
    return errorResponse(401, 'App authentication required.');
  }

  if (request.method.toUpperCase() !== 'POST') {
    return errorResponse(
      405,
      `Method ${request.method.toUpperCase()} not allowed.`,
    );
  }

  const body = await parseRequestJson(
    request,
    providerOauthAuthorizeBodySchema,
  );
  if (!body) {
    return errorResponse(400, 'Invalid provider oauth authorize payload.');
  }

  const oauthMethodId = resolveRequestedOauthMethodId(
    body.providerId,
    body.methodId,
  );
  if (!oauthMethodId) {
    return errorResponse(
      400,
      `OAuth authorize is not supported for provider "${body.providerId}" and method "${body.methodId ?? 'default'}".`,
    );
  }

  const requestUrl = new URL(request.url);
  const nowInSeconds = resolveNow(options);
  const verifier = generateRandomString(64);
  const challenge = sha256Base64Url(verifier);
  const state = generateRandomString(48);
  const redirectUri =
    body.redirectUri || `${requestUrl.origin}/v1/auth/providers/oauth/callback`;
  const statePayload: ProviderOauthStatePayload = {
    providerId: body.providerId,
    methodId: oauthMethodId,
    state,
    verifier,
    redirectUri,
    expiresAt: nowInSeconds + OPENAI_OAUTH_STATE_TTL_SECONDS,
    returnTo: body.returnTo,
    model: body.model,
    antigravityProjectId: body.projectId?.trim() || undefined,
  };

  let authorizationUrl: string;
  let instructions = 'Continue in browser and complete OAuth login.';
  let extraPayload: Record<string, unknown> = {};

  if (body.providerId === 'openai') {
    if (oauthMethodId === OPENAI_CHATGPT_HEADLESS_OAUTH_METHOD_ID) {
      const deviceAuthorization =
        await requestOpenAiDeviceAuthorization(options);
      statePayload.openAiDeviceAuthId = deviceAuthorization.deviceAuthId;
      statePayload.openAiDeviceUserCode = deviceAuthorization.userCode;
      statePayload.openAiDeviceIntervalSeconds =
        deviceAuthorization.intervalSeconds;
      authorizationUrl = `${OPENAI_OAUTH_ISSUER}/codex/device`;
      instructions =
        'Open the URL, enter the verification code, then poll callback to finalize.';
      extraPayload = {
        verificationCode: deviceAuthorization.userCode,
        pollingIntervalSeconds: deviceAuthorization.intervalSeconds,
      };
    } else {
      authorizationUrl = buildOpenAiAuthorizeUrl({
        redirectUri,
        challenge,
        state,
      });
    }
  } else if (body.providerId === 'google') {
    const googleClient = resolveGoogleAntigravityClientConfig();
    authorizationUrl = buildGoogleAntigravityAuthorizeUrl({
      redirectUri,
      challenge,
      state,
      clientId: googleClient.clientId,
      projectId: body.projectId,
    });
    instructions =
      'Continue in browser, authorize Google, and return to complete setup.';
  } else if (body.providerId === 'opencode') {
    authorizationUrl = buildOpencodeAuthorizeUrl({
      redirectUri,
      challenge,
      state,
    });
    instructions =
      'Continue in browser, authorize OpenCode, and return to complete setup.';
  } else if (body.providerId === 'openrouter') {
    authorizationUrl = buildOpenRouterAuthorizeUrl({
      redirectUri,
      challenge,
      state,
    });
    instructions =
      'Continue in browser, authorize OpenRouter, and return to complete setup.';
  } else if (body.providerId === 'github-copilot') {
    const deviceAuthorization =
      await requestGithubCopilotDeviceAuthorization(options);
    statePayload.githubCopilotDeviceCode = deviceAuthorization.deviceCode;
    statePayload.githubCopilotIntervalSeconds =
      deviceAuthorization.intervalSeconds;
    authorizationUrl = deviceAuthorization.verificationUri;
    instructions =
      'Open the URL, enter the verification code, then poll callback to finalize.';
    extraPayload = {
      verificationCode: deviceAuthorization.userCode,
      pollingIntervalSeconds: deviceAuthorization.intervalSeconds,
    };
  } else {
    return errorResponse(
      400,
      `OAuth authorize is not supported for provider "${body.providerId}".`,
    );
  }

  return jsonResponseWithCookies(
    {
      object: 'provider_oauth_authorization',
      providerId: body.providerId,
      method: oauthMethodId,
      authorizationUrl,
      expiresAt: statePayload.expiresAt,
      redirectUri,
      instructions,
      ...extraPayload,
    },
    200,
    [
      buildProviderOauthStateSetCookie(statePayload, {
        secret: options.secret,
        maxAgeSeconds: OPENAI_OAUTH_STATE_TTL_SECONDS,
      }),
    ],
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function oauthFailureResponse(input: {
  requestMethod: string;
  status: number;
  message: string;
  clearStateCookie?: boolean;
}): Response {
  const cookies = input.clearStateCookie
    ? [buildProviderOauthStateClearCookie()]
    : [];
  if (input.requestMethod === 'GET') {
    return htmlResponse(
      `<html><body><h1>OAuth callback failed</h1><p>${escapeHtml(input.message)}</p></body></html>`,
      input.status,
      cookies,
    );
  }

  if (cookies.length > 0) {
    return jsonResponseWithCookies(
      {
        error: {
          message: input.message,
        },
      },
      input.status,
      cookies,
    );
  }

  return errorResponse(input.status, input.message);
}

function oauthSuccessResponse(input: {
  requestMethod: string;
  providerId: string;
  methodId: string;
  oauthState: ProviderOauthStatePayload;
  updatedCredential: StoredProviderCredential;
  secret?: string;
  store: Record<string, StoredProviderCredential>;
  title: string;
  message: string;
}): Response {
  input.store[input.updatedCredential.providerId] = input.updatedCredential;
  const cookies = [
    buildProviderCredentialStoreSetCookie(input.store, {
      secret: input.secret,
    }),
    buildProviderOauthStateClearCookie(),
  ];

  if (input.requestMethod === 'GET') {
    if (input.oauthState.returnTo) {
      const redirectTarget = new URL(input.oauthState.returnTo);
      redirectTarget.searchParams.set('oauth', 'success');
      const headers = new Headers({
        Location: redirectTarget.toString(),
      });
      for (const cookie of cookies) {
        headers.append('Set-Cookie', cookie);
      }
      return new Response(null, {
        status: 302,
        headers,
      });
    }
    return htmlResponse(
      `<html><body><h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.message)}</p><script>setTimeout(() => window.close(), 1500)</script></body></html>`,
      200,
      cookies,
    );
  }

  return jsonResponseWithCookies(
    {
      object: 'provider_oauth_callback',
      providerId: input.providerId,
      method: input.methodId,
      data: sanitizeStoredProviderCredential(input.updatedCredential),
    },
    200,
    cookies,
  );
}

export async function handleProviderOauthCallbackRequest(
  request: Request,
  options: HandlerOptions = {},
): Promise<Response> {
  const method = request.method.toUpperCase();
  const requestUrl = new URL(request.url);

  if (!hasAppAuthCookie(request)) {
    if (method === 'GET') {
      return htmlResponse(
        '<html><body><h1>Authentication required</h1><p>Please sign in and retry OAuth.</p></body></html>',
        401,
      );
    }
    return errorResponse(401, 'App authentication required.');
  }

  let payload: {
    code?: string;
    state?: string;
  } | null = null;

  if (method === 'GET') {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    payload = {
      code: code ?? undefined,
      state: state ?? undefined,
    };
  } else if (method === 'POST') {
    payload = await parseRequestJson(request, providerOauthCallbackBodySchema);
  } else {
    return errorResponse(405, `Method ${method} not allowed.`);
  }

  if (!payload) {
    return oauthFailureResponse({
      requestMethod: method,
      status: 400,
      message: 'Missing OAuth callback payload.',
    });
  }

  const oauthState = readProviderOauthStateFromRequest(request, {
    secret: options.secret,
    now: resolveNow(options),
  });
  if (!oauthState) {
    return oauthFailureResponse({
      requestMethod: method,
      status: 400,
      message: 'OAuth state is missing or expired.',
    });
  }

  const oauthMethodId = resolveRequestedOauthMethodId(
    oauthState.providerId,
    oauthState.methodId,
  );
  if (!oauthMethodId) {
    return oauthFailureResponse({
      requestMethod: method,
      status: 400,
      message: `Unsupported OAuth provider state for "${oauthState.providerId}".`,
      clearStateCookie: true,
    });
  }

  const requestState = payload.state?.trim();
  if (requestState && oauthState.state !== requestState) {
    return oauthFailureResponse({
      requestMethod: method,
      status: 400,
      message: 'OAuth state mismatch.',
      clearStateCookie: true,
    });
  }

  const store = readProviderCredentialStoreFromRequest(request, {
    secret: options.secret,
  });
  const nowInSeconds = resolveNow(options);

  if (oauthState.providerId === 'openai') {
    let tokens: Awaited<ReturnType<typeof exchangeOpenAiAuthorizationCode>>;
    try {
      if (isOpenAiBrowserOauthMethod(oauthMethodId)) {
        if (!payload.code || !payload.state) {
          return oauthFailureResponse({
            requestMethod: method,
            status: 400,
            message: 'Missing OAuth code or state.',
          });
        }
        tokens = await exchangeOpenAiAuthorizationCode(
          payload.code,
          oauthState.redirectUri,
          oauthState.verifier,
          options,
        );
      } else if (oauthMethodId === OPENAI_CHATGPT_HEADLESS_OAUTH_METHOD_ID) {
        const headless = await pollOpenAiDeviceAuthorization(
          oauthState,
          options,
        );
        if (headless.pending || !headless.tokens) {
          return jsonResponse(
            {
              object: 'provider_oauth_callback',
              providerId: 'openai',
              method: oauthMethodId,
              status: 'pending',
              retryAfterSeconds: headless.retryAfterSeconds,
            },
            202,
            {
              'Retry-After': String(headless.retryAfterSeconds),
            },
          );
        }
        tokens = headless.tokens;
      } else {
        return oauthFailureResponse({
          requestMethod: method,
          status: 400,
          message: `Unsupported OpenAI OAuth method "${oauthMethodId}".`,
          clearStateCookie: true,
        });
      }
    } catch (error) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 502,
        message:
          error instanceof Error
            ? error.message
            : 'OpenAI OAuth token exchange failed.',
        clearStateCookie: true,
      });
    }

    const model = oauthState.model ?? 'gpt-5-mini';
    const expiresAt = resolveOpenAiOauthExpiresAt(
      nowInSeconds,
      tokens.expires_in,
    );
    const chatGptAccountId = extractOpenAiChatGptAccountId(tokens);
    const normalized = normalizeAssistantProviderConfig(
      {
        providerId: 'openai',
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: expiresAt,
        chatGptAccountId,
        baseURL: OPENAI_OAUTH_DEFAULT_BASE_URL,
        headers: chatGptAccountId
          ? {
              'ChatGPT-Account-Id': chatGptAccountId,
            }
          : undefined,
      },
      model,
    );
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: nowInSeconds,
    };

    return oauthSuccessResponse({
      requestMethod: method,
      providerId: 'openai',
      methodId: oauthMethodId,
      oauthState,
      updatedCredential: updated,
      secret: options.secret,
      store,
      title: 'OpenAI subscription connected',
      message: 'You can close this window and return to onboarding.',
    });
  }

  if (oauthState.providerId === 'google') {
    if (!payload.code || !payload.state) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 400,
        message: 'Missing OAuth code or state.',
      });
    }

    const googleClient = resolveGoogleAntigravityClientConfig();
    let tokens: Awaited<ReturnType<typeof exchangeGoogleAuthorizationCode>>;
    try {
      tokens = await exchangeGoogleAuthorizationCode(
        {
          code: payload.code,
          redirectUri: oauthState.redirectUri,
          verifier: oauthState.verifier,
          clientId: googleClient.clientId,
          clientSecret: googleClient.clientSecret,
          projectId: oauthState.antigravityProjectId,
        },
        options,
      );
    } catch (error) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 502,
        message:
          error instanceof Error
            ? error.message
            : 'Google OAuth token exchange failed.',
        clearStateCookie: true,
      });
    }

    const model = oauthState.model ?? 'gemini-2.5-flash';
    const expiresAt = resolveGoogleOauthExpiresAt(
      nowInSeconds,
      tokens.expires_in,
    );
    const normalized = normalizeAssistantProviderConfig(
      {
        providerId: 'google',
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: expiresAt,
        headers: tokens.project_id
          ? {
              'x-goog-user-project': tokens.project_id,
            }
          : undefined,
      },
      model,
    );
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: nowInSeconds,
    };

    return oauthSuccessResponse({
      requestMethod: method,
      providerId: 'google',
      methodId: oauthMethodId,
      oauthState,
      updatedCredential: updated,
      secret: options.secret,
      store,
      title: 'Google OAuth connected',
      message: 'Google subscription credential is ready to use.',
    });
  }

  if (oauthState.providerId === 'opencode') {
    if (!payload.code || !payload.state) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 400,
        message: 'Missing OAuth code or state.',
      });
    }

    let token: Awaited<ReturnType<typeof exchangeOpencodeAuthorizationCode>>;
    try {
      token = await exchangeOpencodeAuthorizationCode(
        {
          code: payload.code,
          redirectUri: oauthState.redirectUri,
          verifier: oauthState.verifier,
        },
        options,
      );
    } catch (error) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 502,
        message:
          error instanceof Error
            ? error.message
            : 'OpenCode OAuth token exchange failed.',
        clearStateCookie: true,
      });
    }

    const model = oauthState.model ?? 'gpt-5.2-codex';
    const normalized = normalizeAssistantProviderConfig(
      {
        providerId: 'opencode',
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: token.access_token,
        oauthRefreshToken: token.refresh_token,
        oauthExpiresAt:
          typeof token.expires_in === 'number'
            ? resolveOpenAiOauthExpiresAt(nowInSeconds, token.expires_in)
            : undefined,
      },
      model,
    );
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: nowInSeconds,
    };

    return oauthSuccessResponse({
      requestMethod: method,
      providerId: 'opencode',
      methodId: oauthMethodId,
      oauthState,
      updatedCredential: updated,
      secret: options.secret,
      store,
      title: 'OpenCode account connected',
      message: 'OpenCode OAuth credential is ready to use.',
    });
  }

  if (oauthState.providerId === 'openrouter') {
    if (!payload.code || !payload.state) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 400,
        message: 'Missing OAuth code or state.',
      });
    }

    let token: Awaited<ReturnType<typeof exchangeOpenRouterAuthorizationCode>>;
    try {
      token = await exchangeOpenRouterAuthorizationCode(
        {
          code: payload.code,
          verifier: oauthState.verifier,
        },
        options,
      );
    } catch (error) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 502,
        message:
          error instanceof Error
            ? error.message
            : 'OpenRouter OAuth token exchange failed.',
        clearStateCookie: true,
      });
    }

    const model = oauthState.model ?? 'openai/gpt-5';
    const normalized = normalizeAssistantProviderConfig(
      {
        providerId: 'openrouter',
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: token.key,
      },
      model,
    );
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: nowInSeconds,
    };

    return oauthSuccessResponse({
      requestMethod: method,
      providerId: 'openrouter',
      methodId: oauthMethodId,
      oauthState,
      updatedCredential: updated,
      secret: options.secret,
      store,
      title: 'OpenRouter account connected',
      message: 'OpenRouter OAuth credential is ready to use.',
    });
  }

  if (oauthState.providerId === 'github-copilot') {
    if (oauthMethodId !== GITHUB_COPILOT_DEVICE_OAUTH_METHOD_ID) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 400,
        message: `Unsupported GitHub Copilot OAuth method "${oauthMethodId}".`,
        clearStateCookie: true,
      });
    }

    let devicePoll: Awaited<ReturnType<typeof pollGithubCopilotDeviceOauth>>;
    try {
      devicePoll = await pollGithubCopilotDeviceOauth(oauthState, options);
    } catch (error) {
      return oauthFailureResponse({
        requestMethod: method,
        status: 502,
        message:
          error instanceof Error
            ? error.message
            : 'GitHub Copilot device authorization failed.',
        clearStateCookie: true,
      });
    }

    if (devicePoll.pending || !devicePoll.accessToken) {
      return jsonResponse(
        {
          object: 'provider_oauth_callback',
          providerId: 'github-copilot',
          method: oauthMethodId,
          status: 'pending',
          retryAfterSeconds: devicePoll.retryAfterSeconds,
        },
        202,
        {
          'Retry-After': String(devicePoll.retryAfterSeconds),
        },
      );
    }

    const model = oauthState.model ?? 'gpt-4.1';
    const normalized = normalizeAssistantProviderConfig(
      {
        providerId: 'github-copilot',
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: devicePoll.accessToken,
        headers: {
          'Openai-Intent': 'conversation-edits',
          'x-initiator': 'user',
        },
      },
      model,
    );
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: nowInSeconds,
    };

    return oauthSuccessResponse({
      requestMethod: method,
      providerId: 'github-copilot',
      methodId: oauthMethodId,
      oauthState,
      updatedCredential: updated,
      secret: options.secret,
      store,
      title: 'GitHub Copilot connected',
      message: 'GitHub Copilot OAuth credential is ready to use.',
    });
  }

  return oauthFailureResponse({
    requestMethod: method,
    status: 400,
    message: `Unsupported OAuth provider "${oauthState.providerId}".`,
    clearStateCookie: true,
  });
}

export async function handleProviderCredentialRequest(
  request: Request,
  options: HandlerOptions = {},
): Promise<Response> {
  if (!hasAppAuthCookie(request)) {
    return errorResponse(401, 'App authentication required.');
  }

  const method = request.method.toUpperCase();
  const store = readProviderCredentialStoreFromRequest(request, {
    secret: options.secret,
  });

  if (method === 'GET') {
    const data = Object.values(store)
      .map((credential) => sanitizeStoredProviderCredential(credential))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return jsonResponse({ object: 'list', data });
  }

  if (method === 'POST') {
    const body = await parseRequestJson(
      request,
      upsertProviderCredentialSchema,
    );
    if (!body) {
      return errorResponse(400, 'Invalid provider credential payload.');
    }

    const normalized = normalizeAssistantProviderConfig(body, body.model);
    const updated: StoredProviderCredential = {
      ...normalized,
      updatedAt: resolveNow(options),
    };
    store[updated.providerId] = updated;

    return jsonResponse(
      {
        object: 'provider_credential',
        data: sanitizeStoredProviderCredential(updated),
      },
      200,
      {
        'Set-Cookie': buildProviderCredentialStoreSetCookie(store, {
          secret: options.secret,
        }),
      },
    );
  }

  if (method === 'DELETE') {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    if (!providerId) {
      return errorResponse(400, 'Missing providerId query parameter.');
    }

    const deleted = Boolean(store[providerId]);
    if (deleted) {
      delete store[providerId];
    }

    return jsonResponse(
      {
        deleted,
      },
      200,
      {
        'Set-Cookie': buildProviderCredentialStoreSetCookie(store, {
          secret: options.secret,
        }),
      },
    );
  }

  return errorResponse(405, `Method ${method} not allowed.`);
}

export async function handleAuthSessionRequest(
  request: Request,
  options: HandlerOptions = {},
): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === 'POST') {
    if (!hasAppAuthCookie(request)) {
      return errorResponse(401, 'App authentication required.');
    }

    const body = await parseRequestJson(request, createSessionBodySchema);
    if (!body) {
      return errorResponse(400, 'Invalid auth session payload.');
    }

    const store = readProviderCredentialStoreFromRequest(request, {
      secret: options.secret,
    });

    let providerConfig: AssistantProviderConfig;
    let storedProviderForUpdate: StoredProviderCredential | null = null;
    if (body.provider) {
      providerConfig = normalizeAssistantProviderConfig(
        {
          ...body.provider,
          model: body.model ?? body.provider.model,
        },
        body.model ?? body.provider.model,
      );
    } else {
      if (!body.providerId) {
        const firstStoredProvider = Object.values(store)[0];
        if (!firstStoredProvider) {
          return errorResponse(400, 'No stored provider credential found.');
        }
        storedProviderForUpdate = firstStoredProvider;
        providerConfig = {
          ...firstStoredProvider,
          model: body.model ?? firstStoredProvider.model,
        };
      } else {
        const storedProvider = store[body.providerId];
        if (!storedProvider) {
          return errorResponse(
            404,
            `No stored provider credential for "${body.providerId}".`,
          );
        }
        storedProviderForUpdate = storedProvider;
        providerConfig = {
          ...storedProvider,
          model: body.model ?? storedProvider.model,
        };
      }
    }

    const nowInSeconds = resolveNow(options);
    let shouldSetStoreCookie = false;
    try {
      const refreshed = await refreshProviderCredentialIfNeeded(
        providerConfig,
        {
          nowInSeconds,
          model: providerConfig.model,
          fetch: options.fetch,
        },
      );
      providerConfig = refreshed.provider;

      if (refreshed.refreshed && storedProviderForUpdate) {
        store[storedProviderForUpdate.providerId] = {
          ...storedProviderForUpdate,
          oauthAccessToken: refreshed.provider.oauthAccessToken,
          oauthRefreshToken: refreshed.provider.oauthRefreshToken,
          oauthExpiresAt: refreshed.provider.oauthExpiresAt,
          chatGptAccountId: refreshed.provider.chatGptAccountId,
          baseURL:
            refreshed.provider.baseURL ?? storedProviderForUpdate.baseURL,
          headers:
            refreshed.provider.headers ?? storedProviderForUpdate.headers,
          updatedAt: nowInSeconds,
        };
        shouldSetStoreCookie = true;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'OAuth token refresh failed.';
      return errorResponse(502, message);
    }

    const ttlSeconds = body.ttlSeconds ?? 3600;
    const sessionToken = createAiAuthSessionToken(providerConfig, {
      secret: options.secret,
      now: nowInSeconds,
      ttlSeconds,
    });

    return jsonResponse(
      {
        object: 'auth_session',
        sessionToken,
        providerId: providerConfig.providerId,
        model: providerConfig.model,
        authMode: providerConfig.authMode,
        issuedAt: nowInSeconds,
        expiresAt: nowInSeconds + ttlSeconds,
      },
      200,
      shouldSetStoreCookie
        ? {
            'Set-Cookie': buildProviderCredentialStoreSetCookie(store, {
              secret: options.secret,
            }),
          }
        : undefined,
    );
  }

  if (method === 'GET') {
    const token = extractBearerToken(request);
    const session = decodeAiAuthSessionToken(token, {
      secret: options.secret,
      now: resolveNow(options),
    });
    if (!session) {
      return errorResponse(401, 'Invalid or expired auth session token.');
    }

    return jsonResponse({
      object: 'auth_session',
      sessionId: session.jti,
      providerId: session.provider.providerId,
      model: session.provider.model,
      authMode: session.provider.authMode,
      issuedAt: session.iat,
      expiresAt: session.exp,
    });
  }

  if (method === 'DELETE') {
    const token = extractBearerToken(request);
    const revoked = revokeAiAuthSessionToken(token, {
      secret: options.secret,
      now: resolveNow(options),
    });
    if (!revoked) {
      return errorResponse(401, 'Invalid or expired auth session token.');
    }
    return jsonResponse({
      revoked: true,
    });
  }

  return errorResponse(405, `Method ${method} not allowed.`);
}
