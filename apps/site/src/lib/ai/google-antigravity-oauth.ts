import {
  type AssistantProviderConfig,
  normalizeAssistantProviderConfig,
} from './business-onboarding-provider-runtime';

export const GOOGLE_ANTIGRAVITY_OAUTH_AUTHORIZE_ENDPOINT =
  process.env.GOOGLE_ANTIGRAVITY_OAUTH_AUTHORIZE_ENDPOINT ??
  'https://accounts.google.com/o/oauth2/v2/auth';

export const GOOGLE_OAUTH_TOKEN_ENDPOINT =
  process.env.GOOGLE_OAUTH_TOKEN_ENDPOINT ??
  'https://oauth2.googleapis.com/token';

export const GOOGLE_OAUTH_USERINFO_ENDPOINT =
  process.env.GOOGLE_OAUTH_USERINFO_ENDPOINT ??
  'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';

export const GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID =
  process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID ??
  '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';

export const GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET =
  process.env.GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET ??
  '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';

const GOOGLE_ANTIGRAVITY_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cclog',
  'https://www.googleapis.com/auth/experimentsandconfigs',
] as const;

const GOOGLE_ANTIGRAVITY_LOAD_ENDPOINTS = [
  'https://cloudcode-pa.googleapis.com',
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://autopush-cloudcode-pa.sandbox.googleapis.com',
] as const;

const GOOGLE_ANTIGRAVITY_ENDPOINT_FALLBACKS = [
  'https://daily-cloudcode-pa.sandbox.googleapis.com',
  'https://autopush-cloudcode-pa.sandbox.googleapis.com',
  'https://cloudcode-pa.googleapis.com',
] as const;

const GOOGLE_ANTIGRAVITY_FETCH_TIMEOUT_MS = 10_000;

type GoogleOauthRequestOptions = {
  fetch?: typeof fetch;
};

type RefreshGoogleProviderCredentialOptions = GoogleOauthRequestOptions & {
  nowInSeconds: number;
  model?: string;
  expiryLeewaySeconds?: number;
};

type GoogleOauthClientConfig = {
  clientId: string;
  clientSecret: string;
};

export type GoogleOauthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
  email?: string;
  project_id?: string;
};

export type ExchangeGoogleAuthorizationCodeInput = {
  code: string;
  redirectUri: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
  projectId?: string;
};

export type RefreshGoogleAccessTokenInput = {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
};

export function resolveGoogleAntigravityClientConfig(): GoogleOauthClientConfig {
  return {
    clientId: GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID,
    clientSecret: GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_SECRET,
  };
}

function parseGoogleTokenResponse(
  payload: unknown,
  fallbackRefreshToken?: string,
): GoogleOauthTokenResponse {
  const parsed =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};

  const accessToken =
    typeof parsed.access_token === 'string' ? parsed.access_token.trim() : '';
  const explicitRefreshToken =
    typeof parsed.refresh_token === 'string' ? parsed.refresh_token.trim() : '';
  const refreshToken =
    explicitRefreshToken || fallbackRefreshToken?.trim() || '';
  const expiresIn =
    typeof parsed.expires_in === 'number' && Number.isFinite(parsed.expires_in)
      ? Math.floor(parsed.expires_in)
      : undefined;
  const idToken =
    typeof parsed.id_token === 'string' ? parsed.id_token.trim() : undefined;
  const scope =
    typeof parsed.scope === 'string' ? parsed.scope.trim() : undefined;
  const tokenType =
    typeof parsed.token_type === 'string'
      ? parsed.token_type.trim()
      : undefined;

  if (!accessToken || !refreshToken) {
    throw new Error(
      'OAuth token response is missing access_token or refresh_token.',
    );
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    id_token: idToken,
    scope,
    token_type: tokenType,
  };
}

async function requestGoogleToken(
  body: URLSearchParams,
  options: GoogleOauthRequestOptions,
  operationName: string,
  fallbackRefreshToken?: string,
): Promise<GoogleOauthTokenResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`${operationName} failed with status ${response.status}`);
  }

  return parseGoogleTokenResponse(await response.json(), fallbackRefreshToken);
}

function googleMetadataPlatform(): 'WINDOWS' | 'MACOS' {
  return process.platform === 'win32' ? 'WINDOWS' : 'MACOS';
}

function antigravityLoadRequestHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'google-api-nodejs-client/9.15.1',
    'Client-Metadata': `{"ideType":"ANTIGRAVITY","platform":"${googleMetadataPlatform()}","pluginType":"GEMINI"}`,
  };
}

function antigravityLoadRequestBody(): string {
  return JSON.stringify({
    metadata: {
      ideType: 'ANTIGRAVITY',
      platform: googleMetadataPlatform(),
      pluginType: 'GEMINI',
    },
  });
}

function parseProjectIdFromLoadCodeAssistPayload(
  payload: unknown,
): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const parsed = payload as Record<string, unknown>;

  const direct = parsed.cloudaicompanionProject;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }

  if (direct && typeof direct === 'object') {
    const nestedId = (direct as { id?: unknown }).id;
    if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
      return nestedId.trim();
    }
  }

  return undefined;
}

export async function resolveGoogleAntigravityProjectId(
  accessToken: string,
  options: GoogleOauthRequestOptions = {},
): Promise<string | undefined> {
  const fetchImpl = options.fetch ?? fetch;
  const endpoints = Array.from(
    new Set([
      ...GOOGLE_ANTIGRAVITY_LOAD_ENDPOINTS,
      ...GOOGLE_ANTIGRAVITY_ENDPOINT_FALLBACKS,
    ]),
  );

  for (const baseEndpoint of endpoints) {
    try {
      const response = await fetchImpl(
        `${baseEndpoint}/v1internal:loadCodeAssist`,
        {
          method: 'POST',
          headers: antigravityLoadRequestHeaders(accessToken),
          body: antigravityLoadRequestBody(),
          signal: AbortSignal.timeout(GOOGLE_ANTIGRAVITY_FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) continue;
      const projectId = parseProjectIdFromLoadCodeAssistPayload(
        await response.json(),
      );
      if (projectId) return projectId;
    } catch {
      // Keep trying fallback endpoints.
    }
  }

  return undefined;
}

async function fetchGoogleOauthUserEmail(
  accessToken: string,
  options: GoogleOauthRequestOptions = {},
): Promise<string | undefined> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(GOOGLE_OAUTH_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(GOOGLE_ANTIGRAVITY_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return undefined;

  const payload = (await response.json()) as { email?: unknown };
  return typeof payload.email === 'string' && payload.email.trim().length > 0
    ? payload.email.trim()
    : undefined;
}

export function buildGoogleAntigravityAuthorizeUrl(input: {
  redirectUri: string;
  challenge: string;
  state: string;
  clientId?: string;
  projectId?: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId ?? GOOGLE_ANTIGRAVITY_OAUTH_CLIENT_ID,
    response_type: 'code',
    redirect_uri: input.redirectUri,
    scope: GOOGLE_ANTIGRAVITY_OAUTH_SCOPES.join(' '),
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    state: input.state,
    access_type: 'offline',
    prompt: 'consent',
  });
  if (input.projectId?.trim()) {
    params.set('project_id', input.projectId.trim());
  }
  return `${GOOGLE_ANTIGRAVITY_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGoogleAuthorizationCode(
  input: ExchangeGoogleAuthorizationCodeInput,
  options: GoogleOauthRequestOptions = {},
): Promise<GoogleOauthTokenResponse> {
  const tokens = await requestGoogleToken(
    new URLSearchParams({
      code: input.code,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
      client_id: input.clientId,
      client_secret: input.clientSecret,
    }),
    options,
    'Token exchange',
  );

  const [email, projectId] = await Promise.all([
    fetchGoogleOauthUserEmail(tokens.access_token, options).catch(
      () => undefined,
    ),
    resolveGoogleAntigravityProjectId(tokens.access_token, options).catch(
      () => input.projectId,
    ),
  ]);

  return {
    ...tokens,
    email,
    project_id: projectId ?? input.projectId,
  };
}

export async function refreshGoogleAccessToken(
  input: RefreshGoogleAccessTokenInput,
  options: GoogleOauthRequestOptions = {},
): Promise<GoogleOauthTokenResponse> {
  return requestGoogleToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
    }),
    options,
    'Token refresh',
    input.refreshToken,
  );
}

export function resolveGoogleOauthExpiresAt(
  nowInSeconds: number,
  expiresIn?: number,
): number {
  return nowInSeconds + Math.max(60, Math.floor(expiresIn ?? 3600));
}

export function shouldRefreshGoogleProviderCredential(
  provider: AssistantProviderConfig,
  nowInSeconds: number,
  expiryLeewaySeconds = 60,
): boolean {
  if (
    provider.providerId !== 'google' ||
    provider.authMode !== 'oauth-access-token'
  ) {
    return false;
  }

  if (!provider.oauthRefreshToken?.trim()) {
    return false;
  }

  const oauthAccessToken = provider.oauthAccessToken?.trim();
  if (!oauthAccessToken) return true;

  const expiresAt = provider.oauthExpiresAt ?? 0;
  return expiresAt <= nowInSeconds + Math.max(0, expiryLeewaySeconds);
}

function mergeHeaders(
  base: Record<string, string> | undefined,
  additions: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const next: Record<string, string> = {
    ...(base ?? {}),
  };
  for (const [key, value] of Object.entries(additions)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      next[key] = value.trim();
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export async function refreshGoogleProviderCredentialIfNeeded(
  provider: AssistantProviderConfig,
  options: RefreshGoogleProviderCredentialOptions,
): Promise<{
  provider: AssistantProviderConfig;
  refreshed: boolean;
}> {
  if (
    !shouldRefreshGoogleProviderCredential(
      provider,
      options.nowInSeconds,
      options.expiryLeewaySeconds,
    )
  ) {
    return {
      provider,
      refreshed: false,
    };
  }

  const refreshToken = provider.oauthRefreshToken?.trim();
  if (!refreshToken) {
    return {
      provider,
      refreshed: false,
    };
  }

  const clientConfig = resolveGoogleAntigravityClientConfig();
  const tokens = await refreshGoogleAccessToken(
    {
      refreshToken,
      clientId: clientConfig.clientId,
      clientSecret: clientConfig.clientSecret,
    },
    options,
  );
  const model = options.model ?? provider.model;
  const existingProjectId =
    provider.headers?.['x-goog-user-project'] ??
    provider.headers?.['X-Goog-User-Project'];

  return {
    provider: normalizeAssistantProviderConfig(
      {
        ...provider,
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: resolveGoogleOauthExpiresAt(
          options.nowInSeconds,
          tokens.expires_in,
        ),
        headers: mergeHeaders(provider.headers, {
          'x-goog-user-project': tokens.project_id ?? existingProjectId,
        }),
      },
      model,
    ),
    refreshed: true,
  };
}
