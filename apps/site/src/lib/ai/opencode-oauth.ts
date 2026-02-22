function resolveOpencodeOauthAuthorizeEndpoint(): string | undefined {
  return process.env.OPENCODE_OAUTH_AUTHORIZE_ENDPOINT?.trim() || undefined;
}

function resolveOpencodeOauthTokenEndpoint(): string | undefined {
  return process.env.OPENCODE_OAUTH_TOKEN_ENDPOINT?.trim() || undefined;
}

function resolveOpencodeOauthClientId(): string | undefined {
  return process.env.OPENCODE_OAUTH_CLIENT_ID?.trim() || undefined;
}

function resolveOpencodeOauthScope(): string {
  return (
    process.env.OPENCODE_OAUTH_SCOPE?.trim() ||
    'openid profile email offline_access'
  );
}

type OpencodeOauthRequestOptions = {
  fetch?: typeof fetch;
};

export function isOpencodeOauthConfigured(): boolean {
  return Boolean(
    resolveOpencodeOauthAuthorizeEndpoint() &&
      resolveOpencodeOauthTokenEndpoint() &&
      resolveOpencodeOauthClientId(),
  );
}

export function buildOpencodeAuthorizeUrl(input: {
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const authorizeEndpoint = resolveOpencodeOauthAuthorizeEndpoint();
  const clientId = resolveOpencodeOauthClientId();
  if (!authorizeEndpoint || !clientId) {
    throw new Error(
      'OpenCode OAuth is not configured. Set OPENCODE_OAUTH_AUTHORIZE_ENDPOINT and OPENCODE_OAUTH_CLIENT_ID.',
    );
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: input.redirectUri,
    scope: resolveOpencodeOauthScope(),
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    state: input.state,
  });
  return `${authorizeEndpoint}?${params.toString()}`;
}

export type OpencodeOAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function exchangeOpencodeAuthorizationCode(
  input: {
    code: string;
    redirectUri: string;
    verifier: string;
  },
  options: OpencodeOauthRequestOptions = {},
): Promise<OpencodeOAuthTokenResponse> {
  const tokenEndpoint = resolveOpencodeOauthTokenEndpoint();
  const clientId = resolveOpencodeOauthClientId();
  if (!tokenEndpoint || !clientId) {
    throw new Error(
      'OpenCode OAuth is not configured. Set OPENCODE_OAUTH_TOKEN_ENDPOINT and OPENCODE_OAUTH_CLIENT_ID.',
    );
  }

  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(tokenEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: clientId,
      code_verifier: input.verifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(
      `OpenCode OAuth token exchange failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
  };
  const accessToken =
    typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
  const refreshToken =
    typeof payload.refresh_token === 'string'
      ? payload.refresh_token.trim()
      : undefined;
  const expiresIn =
    typeof payload.expires_in === 'number'
      ? payload.expires_in
      : typeof payload.expires_in === 'string'
        ? Number.parseInt(payload.expires_in, 10)
        : undefined;

  if (!accessToken) {
    throw new Error('OpenCode OAuth token response is missing access_token.');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in:
      Number.isFinite(expiresIn) && (expiresIn ?? 0) > 0
        ? Math.floor(expiresIn ?? 0)
        : undefined,
  };
}
