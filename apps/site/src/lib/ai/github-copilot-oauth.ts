export const GITHUB_COPILOT_OAUTH_BASE_URL =
  process.env.GITHUB_COPILOT_OAUTH_BASE_URL ?? 'https://github.com';

export const GITHUB_COPILOT_OAUTH_DEVICE_CODE_ENDPOINT =
  process.env.GITHUB_COPILOT_OAUTH_DEVICE_CODE_ENDPOINT ??
  `${GITHUB_COPILOT_OAUTH_BASE_URL}/login/device/code`;

export const GITHUB_COPILOT_OAUTH_ACCESS_TOKEN_ENDPOINT =
  process.env.GITHUB_COPILOT_OAUTH_ACCESS_TOKEN_ENDPOINT ??
  `${GITHUB_COPILOT_OAUTH_BASE_URL}/login/oauth/access_token`;

export const GITHUB_COPILOT_OAUTH_CLIENT_ID =
  process.env.GITHUB_COPILOT_OAUTH_CLIENT_ID ?? 'Ov23li8tweQw6odWQebz';

const GITHUB_COPILOT_DEFAULT_SCOPE = 'read:user';
const GITHUB_COPILOT_DEFAULT_POLL_INTERVAL_SECONDS = 5;

type GithubCopilotOauthRequestOptions = {
  fetch?: typeof fetch;
};

export async function requestGithubCopilotDeviceAuthorization(
  options: GithubCopilotOauthRequestOptions = {},
): Promise<{
  verificationUri: string;
  userCode: string;
  deviceCode: string;
  intervalSeconds: number;
}> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(GITHUB_COPILOT_OAUTH_DEVICE_CODE_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_COPILOT_OAUTH_CLIENT_ID,
      scope: GITHUB_COPILOT_DEFAULT_SCOPE,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub Copilot device authorization failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    verification_uri?: unknown;
    user_code?: unknown;
    device_code?: unknown;
    interval?: unknown;
  };
  const verificationUri =
    typeof payload.verification_uri === 'string'
      ? payload.verification_uri.trim()
      : '';
  const userCode =
    typeof payload.user_code === 'string' ? payload.user_code.trim() : '';
  const deviceCode =
    typeof payload.device_code === 'string' ? payload.device_code.trim() : '';
  const intervalRaw =
    typeof payload.interval === 'number'
      ? payload.interval
      : typeof payload.interval === 'string'
        ? Number.parseInt(payload.interval, 10)
        : GITHUB_COPILOT_DEFAULT_POLL_INTERVAL_SECONDS;

  if (!verificationUri || !userCode || !deviceCode) {
    throw new Error(
      'GitHub Copilot device authorization response is missing fields.',
    );
  }

  return {
    verificationUri,
    userCode,
    deviceCode,
    intervalSeconds:
      Number.isFinite(intervalRaw) && intervalRaw > 0
        ? Math.floor(intervalRaw)
        : GITHUB_COPILOT_DEFAULT_POLL_INTERVAL_SECONDS,
  };
}

export async function pollGithubCopilotDeviceAuthorization(
  input: {
    deviceCode: string;
    fallbackIntervalSeconds: number;
  },
  options: GithubCopilotOauthRequestOptions = {},
): Promise<
  | {
      pending: true;
      retryAfterSeconds: number;
    }
  | {
      pending: false;
      accessToken: string;
      retryAfterSeconds: number;
    }
> {
  const fetchImpl = options.fetch ?? fetch;
  const response = await fetchImpl(GITHUB_COPILOT_OAUTH_ACCESS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_COPILOT_OAUTH_CLIENT_ID,
      device_code: input.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `GitHub Copilot device polling failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    access_token?: unknown;
    error?: unknown;
    interval?: unknown;
  };
  const accessToken =
    typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
  const error = typeof payload.error === 'string' ? payload.error.trim() : '';
  const intervalRaw =
    typeof payload.interval === 'number'
      ? payload.interval
      : typeof payload.interval === 'string'
        ? Number.parseInt(payload.interval, 10)
        : input.fallbackIntervalSeconds;
  const retryAfterSeconds =
    Number.isFinite(intervalRaw) && intervalRaw > 0
      ? Math.floor(intervalRaw)
      : input.fallbackIntervalSeconds;

  if (accessToken) {
    return {
      pending: false,
      accessToken,
      retryAfterSeconds,
    };
  }

  if (error === 'authorization_pending') {
    return {
      pending: true,
      retryAfterSeconds,
    };
  }

  if (error === 'slow_down') {
    return {
      pending: true,
      retryAfterSeconds: Math.max(
        retryAfterSeconds,
        input.fallbackIntervalSeconds + 5,
      ),
    };
  }

  if (error) {
    throw new Error(`GitHub Copilot device authorization failed: ${error}`);
  }

  return {
    pending: true,
    retryAfterSeconds,
  };
}
