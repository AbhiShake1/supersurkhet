const OPENROUTER_OAUTH_BASE_URL =
  process.env.OPENROUTER_OAUTH_BASE_URL ?? 'https://openrouter.ai';

export const OPENROUTER_OAUTH_AUTHORIZE_ENDPOINT =
  process.env.OPENROUTER_OAUTH_AUTHORIZE_ENDPOINT ??
  `${OPENROUTER_OAUTH_BASE_URL}/auth`;

export const OPENROUTER_OAUTH_EXCHANGE_ENDPOINT =
  process.env.OPENROUTER_OAUTH_EXCHANGE_ENDPOINT ??
  `${OPENROUTER_OAUTH_BASE_URL}/api/v1/auth/keys`;

export const OPENROUTER_OAUTH_CLIENT_NAME =
  process.env.OPENROUTER_OAUTH_CLIENT_NAME ?? 'Supersurkhet';

type OpenRouterOauthRequestOptions = {
  fetch?: typeof fetch;
};

type ExchangeOpenRouterAuthorizationCodeInput = {
  code: string;
  verifier: string;
};

export function buildOpenRouterAuthorizeUrl(input: {
  redirectUri: string;
  challenge: string;
  state: string;
  clientName?: string;
}): string {
  const params = new URLSearchParams({
    callback_url: input.redirectUri,
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    state: input.state,
    client_name: input.clientName ?? OPENROUTER_OAUTH_CLIENT_NAME,
  });
  return `${OPENROUTER_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

export async function exchangeOpenRouterAuthorizationCode(
  input: ExchangeOpenRouterAuthorizationCodeInput,
  options: OpenRouterOauthRequestOptions = {},
): Promise<{ key: string }> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(OPENROUTER_OAUTH_EXCHANGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code: input.code,
      code_verifier: input.verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter OAuth token exchange failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as { key?: unknown };
  const key = typeof payload.key === 'string' ? payload.key.trim() : '';
  if (!key) {
    throw new Error('OpenRouter OAuth response is missing key.');
  }

  return { key };
}
