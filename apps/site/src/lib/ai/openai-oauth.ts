import {
  type AssistantProviderConfig,
  normalizeAssistantProviderConfig,
} from './business-onboarding-provider-runtime';

export const OPENAI_OAUTH_ISSUER =
  process.env.OPENAI_OAUTH_ISSUER ?? 'https://auth.openai.com';
export const OPENAI_OAUTH_CLIENT_ID =
  process.env.OPENAI_OAUTH_CLIENT_ID ?? 'app_EMoamEEZ73f0CkXaXp7hrann';
export const OPENAI_OAUTH_SCOPE = 'openid profile email offline_access';
export const OPENAI_OAUTH_DEFAULT_BASE_URL =
  process.env.OPENAI_OAUTH_BASE_URL ?? 'https://chatgpt.com/backend-api/codex';

export type OpenAiOAuthTokenResponse = {
  id_token?: string;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

type OpenAiOAuthRequestOptions = {
  fetch?: typeof fetch;
};

type RefreshOpenAiProviderCredentialOptions = OpenAiOAuthRequestOptions & {
  nowInSeconds: number;
  model?: string;
  expiryLeewaySeconds?: number;
};

function parseOpenAiTokenResponse(
  payload: unknown,
  fallbackRefreshToken?: string,
): OpenAiOAuthTokenResponse {
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
    typeof parsed.id_token === 'string' ? parsed.id_token : undefined;

  if (!accessToken || !refreshToken) {
    throw new Error(
      'OAuth token response is missing access_token or refresh_token.',
    );
  }

  return {
    id_token: idToken,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  };
}

async function requestOpenAiToken(
  body: URLSearchParams,
  options: OpenAiOAuthRequestOptions,
  operationName: string,
  fallbackRefreshToken?: string,
): Promise<OpenAiOAuthTokenResponse> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(`${OPENAI_OAUTH_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`${operationName} failed with status ${response.status}`);
  }

  return parseOpenAiTokenResponse(await response.json(), fallbackRefreshToken);
}

export async function exchangeOpenAiAuthorizationCode(
  code: string,
  redirectUri: string,
  verifier: string,
  options: OpenAiOAuthRequestOptions = {},
): Promise<OpenAiOAuthTokenResponse> {
  return requestOpenAiToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: OPENAI_OAUTH_CLIENT_ID,
      code_verifier: verifier,
    }),
    options,
    'Token exchange',
  );
}

export async function refreshOpenAiAccessToken(
  refreshToken: string,
  options: OpenAiOAuthRequestOptions = {},
): Promise<OpenAiOAuthTokenResponse> {
  return requestOpenAiToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OPENAI_OAUTH_CLIENT_ID,
    }),
    options,
    'Token refresh',
    refreshToken,
  );
}

export function resolveOpenAiOauthExpiresAt(
  nowInSeconds: number,
  expiresIn?: number,
): number {
  return nowInSeconds + Math.max(60, Math.floor(expiresIn ?? 3600));
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = Buffer.from(parts[1] ?? '', 'base64url').toString('utf8');
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractChatGptAccountIdFromClaims(
  claims: Record<string, unknown>,
): string | undefined {
  const direct = claims.chatgpt_account_id;
  if (typeof direct === 'string' && direct.trim().length > 0) return direct;

  const authObject = claims['https://api.openai.com/auth'];
  if (authObject && typeof authObject === 'object') {
    const nested = (authObject as { chatgpt_account_id?: unknown })
      .chatgpt_account_id;
    if (typeof nested === 'string' && nested.trim().length > 0) return nested;
  }

  const organizations = claims.organizations;
  if (Array.isArray(organizations)) {
    const first = organizations[0] as { id?: unknown } | undefined;
    if (typeof first?.id === 'string' && first.id.trim().length > 0) {
      return first.id;
    }
  }

  return undefined;
}

export function extractOpenAiChatGptAccountId(tokens: {
  id_token?: string;
  access_token: string;
}): string | undefined {
  if (tokens.id_token) {
    const claims = parseJwtClaims(tokens.id_token);
    if (claims) {
      const accountId = extractChatGptAccountIdFromClaims(claims);
      if (accountId) return accountId;
    }
  }

  const accessClaims = parseJwtClaims(tokens.access_token);
  if (!accessClaims) return undefined;
  return extractChatGptAccountIdFromClaims(accessClaims);
}

export function shouldRefreshOpenAiProviderCredential(
  provider: AssistantProviderConfig,
  nowInSeconds: number,
  expiryLeewaySeconds = 60,
): boolean {
  if (
    provider.providerId !== 'openai' ||
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

export async function refreshOpenAiProviderCredentialIfNeeded(
  provider: AssistantProviderConfig,
  options: RefreshOpenAiProviderCredentialOptions,
): Promise<{
  provider: AssistantProviderConfig;
  refreshed: boolean;
}> {
  if (
    !shouldRefreshOpenAiProviderCredential(
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

  const tokens = await refreshOpenAiAccessToken(refreshToken, options);
  const chatGptAccountId =
    extractOpenAiChatGptAccountId(tokens) ?? provider.chatGptAccountId;
  const model = options.model ?? provider.model;

  return {
    provider: normalizeAssistantProviderConfig(
      {
        ...provider,
        model,
        authMode: 'oauth-access-token',
        oauthAccessToken: tokens.access_token,
        oauthRefreshToken: tokens.refresh_token,
        oauthExpiresAt: resolveOpenAiOauthExpiresAt(
          options.nowInSeconds,
          tokens.expires_in,
        ),
        chatGptAccountId,
        baseURL: provider.baseURL || OPENAI_OAUTH_DEFAULT_BASE_URL,
        headers: provider.headers,
      },
      model,
    ),
    refreshed: true,
  };
}
