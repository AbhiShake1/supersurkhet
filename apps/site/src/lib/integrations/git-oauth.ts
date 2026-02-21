import { randomBytes } from 'node:crypto';

export const GITHUB_OAUTH_AUTHORIZE_URL =
  'https://github.com/login/oauth/authorize';
export const GITHUB_OAUTH_TOKEN_URL =
  'https://github.com/login/oauth/access_token';
export const GIT_OAUTH_STATE_COOKIE = 'ss-git-oauth-state';
export const GIT_OAUTH_TOKEN_COOKIE = 'ss-git-oauth-token';
export const GIT_OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const GIT_OAUTH_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export type GitOauthStatePayload = {
  state: string;
  projectId: string;
  returnTo: string;
  createdAt: number;
};

export function generateOauthState(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function encodeGitOauthState(payload: GitOauthStatePayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeGitOauthState(
  encoded: string | null | undefined,
): GitOauthStatePayload | null {
  if (!encoded) return null;
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<GitOauthStatePayload>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.projectId !== 'string' ||
      typeof parsed.returnTo !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    return {
      state: parsed.state,
      projectId: parsed.projectId,
      returnTo: parsed.returnTo,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function buildGithubAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: 'repo read:org read:user user:email',
    state: input.state,
  });
  return `${GITHUB_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export function parseCookieHeader(
  cookieHeader: string | null,
): Record<string, string> {
  if (!cookieHeader) return {};
  const pairs = cookieHeader.split(';');
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const index = pair.indexOf('=');
    if (index === -1) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function buildCookie(input: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly?: boolean;
}): string {
  const segments = [
    `${input.name}=${encodeURIComponent(input.value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(input.maxAgeSeconds))}`,
    'SameSite=Lax',
  ];
  if (input.httpOnly ?? true) {
    segments.push('HttpOnly');
  }
  if (process.env.NODE_ENV === 'production') {
    segments.push('Secure');
  }
  return segments.join('; ');
}

export function buildClearCookie(name: string): string {
  return buildCookie({
    name,
    value: '',
    maxAgeSeconds: 0,
  });
}
