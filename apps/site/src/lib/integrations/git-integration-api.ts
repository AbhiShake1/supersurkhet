import {
  buildClearCookie,
  buildCookie,
  buildGithubAuthorizeUrl,
  decodeGitOauthState,
  encodeGitOauthState,
  GIT_OAUTH_STATE_COOKIE,
  GIT_OAUTH_STATE_TTL_SECONDS,
  GIT_OAUTH_TOKEN_COOKIE,
  GIT_OAUTH_TOKEN_TTL_SECONDS,
  GITHUB_OAUTH_TOKEN_URL,
  generateOauthState,
  parseCookieHeader,
} from './git-oauth';

type GitHubUser = {
  id: number;
  login: string;
  avatar_url?: string;
};

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch?: string;
  owner?: {
    login?: string;
  };
};

function jsonResponse(
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(data, {
    status,
    headers,
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: { message } }, status);
}

function redirectWithCookies(location: string, cookies: string[]): Response {
  const headers = new Headers({
    Location: location,
  });
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  return new Response(null, {
    status: 302,
    headers,
  });
}

function resolveGithubClientId(): string | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  return clientId && clientId.length > 0 ? clientId : null;
}

function resolveGithubClientSecret(): string | null {
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  return clientSecret && clientSecret.length > 0 ? clientSecret : null;
}

async function fetchGithubProfile(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub profile request failed (${response.status})`);
  }
  return (await response.json()) as GitHubUser;
}

async function fetchGithubRepositories(
  accessToken: string,
): Promise<GitHubRepo[]> {
  const response = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub repositories request failed (${response.status})`);
  }
  return (await response.json()) as GitHubRepo[];
}

export async function handleGitOauthStartRequest(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId')?.trim();
  const returnToFromQuery = url.searchParams.get('returnTo')?.trim();
  if (!projectId) {
    return errorResponse(400, 'Missing required projectId query parameter.');
  }

  const clientId = resolveGithubClientId();
  if (!clientId) {
    return errorResponse(500, 'GitHub OAuth is not configured.');
  }

  const origin = url.origin;
  const returnTo = returnToFromQuery || `${origin}/plugin-studio/${projectId}`;
  const redirectUri = `${origin}/v1/integrations/git/oauth/callback`;
  const state = generateOauthState();
  const encodedState = encodeGitOauthState({
    state,
    projectId,
    returnTo,
    createdAt: Date.now(),
  });

  const authorizeUrl = buildGithubAuthorizeUrl({
    clientId,
    redirectUri,
    state,
  });

  return redirectWithCookies(authorizeUrl, [
    buildCookie({
      name: GIT_OAUTH_STATE_COOKIE,
      value: encodedState,
      maxAgeSeconds: GIT_OAUTH_STATE_TTL_SECONDS,
    }),
  ]);
}

export async function handleGitOauthCallbackRequest(
  request: Request,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code')?.trim();
  const returnedState = requestUrl.searchParams.get('state')?.trim();

  const cookieStore = parseCookieHeader(request.headers.get('cookie'));
  const savedState = decodeGitOauthState(cookieStore[GIT_OAUTH_STATE_COOKIE]);

  const fallbackReturnTo = `${requestUrl.origin}/plugin-studio`;
  const returnTo = savedState?.returnTo || fallbackReturnTo;
  const redirectTarget = new URL(returnTo);

  const clearStateCookie = buildClearCookie(GIT_OAUTH_STATE_COOKIE);

  if (!code || !returnedState || !savedState) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  if (savedState.state !== returnedState) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  const stateAgeMs = Date.now() - savedState.createdAt;
  if (stateAgeMs > GIT_OAUTH_STATE_TTL_SECONDS * 1000) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  const clientId = resolveGithubClientId();
  const clientSecret = resolveGithubClientSecret();
  if (!clientId || !clientSecret) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  const redirectUri = `${requestUrl.origin}/v1/integrations/git/oauth/callback`;
  const tokenResponse = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };
  const accessToken = tokenPayload.access_token?.trim();
  if (!accessToken) {
    redirectTarget.searchParams.set('git_oauth', 'error');
    return redirectWithCookies(redirectTarget.toString(), [clearStateCookie]);
  }

  redirectTarget.searchParams.set('git_oauth', 'success');
  return redirectWithCookies(redirectTarget.toString(), [
    clearStateCookie,
    buildCookie({
      name: GIT_OAUTH_TOKEN_COOKIE,
      value: accessToken,
      maxAgeSeconds: GIT_OAUTH_TOKEN_TTL_SECONDS,
    }),
  ]);
}

export async function handleGitRepositoriesRequest(
  request: Request,
): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method === 'DELETE') {
    return jsonResponse(
      {
        object: 'git_repositories',
        disconnected: true,
      },
      200,
      {
        'Set-Cookie': buildClearCookie(GIT_OAUTH_TOKEN_COOKIE),
      },
    );
  }

  const cookieStore = parseCookieHeader(request.headers.get('cookie'));
  const accessToken = cookieStore[GIT_OAUTH_TOKEN_COOKIE]?.trim();
  if (!accessToken) {
    return errorResponse(401, 'Git provider is not connected.');
  }

  try {
    const [profile, repositories] = await Promise.all([
      fetchGithubProfile(accessToken),
      fetchGithubRepositories(accessToken),
    ]);

    return jsonResponse({
      object: 'git_repositories',
      provider: 'github',
      account: {
        id: String(profile.id),
        login: profile.login,
        avatarUrl: profile.avatar_url,
      },
      repositories: repositories.map((repository) => ({
        id: String(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        owner: repository.owner?.login ?? '',
        private: repository.private,
        defaultBranch: repository.default_branch ?? 'main',
        htmlUrl: repository.html_url,
      })),
    });
  } catch {
    return errorResponse(502, 'Failed to fetch repositories from GitHub.');
  }
}
