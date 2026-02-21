import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { nanoid } from 'nanoid';
import type { AssistantProviderConfig } from './business-onboarding-provider-runtime';

const TOKEN_VERSION = 'v1';
const CIPHER = 'aes-256-gcm';
const IV_SIZE = 12;
const AUTH_TAG_SIZE = 16;
const runtimeFallbackSecret = toBase64Url(randomBytes(32));

export const AI_PROVIDER_STORE_COOKIE_NAME = 'ss-ai-provider-store';
export const AI_PROVIDER_OAUTH_STATE_COOKIE_NAME = 'ss-ai-provider-oauth-state';

export type StoredProviderCredential = AssistantProviderConfig & {
  updatedAt: number;
};

export type ProviderCredentialStore = Record<string, StoredProviderCredential>;

export type AiAuthSessionPayload = {
  jti: string;
  iat: number;
  exp: number;
  provider: AssistantProviderConfig;
};

export type ProviderOauthStatePayload = {
  providerId: string;
  methodId?: string;
  state: string;
  verifier: string;
  redirectUri: string;
  expiresAt: number;
  returnTo?: string;
  model?: string;
  openAiDeviceAuthId?: string;
  openAiDeviceUserCode?: string;
  openAiDeviceIntervalSeconds?: number;
  githubCopilotDeviceCode?: string;
  githubCopilotIntervalSeconds?: number;
  antigravityProjectId?: string;
};

type TimeSource = number | (() => number);

type SessionTokenOptions = {
  secret?: string;
  ttlSeconds?: number;
  now?: TimeSource;
};

type SessionDecodeOptions = {
  secret?: string;
  now?: TimeSource;
};

type StoreSecretOptions = {
  secret?: string;
};

const revokedSessionIds = new Map<string, number>();

function toBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength =
    normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return Buffer.from(`${normalized}${'='.repeat(paddingLength)}`, 'base64');
}

function resolveNowInSeconds(source?: TimeSource): number {
  if (typeof source === 'number') {
    return Math.floor(source);
  }
  if (typeof source === 'function') {
    return Math.floor(source());
  }
  return Math.floor(Date.now() / 1000);
}

function resolveSecretKey(secret?: string): Buffer {
  const fallback =
    secret ||
    process.env.AI_AUTH_STORE_SECRET ||
    process.env.OPENAI_API_KEY ||
    runtimeFallbackSecret;
  return createHash('sha256').update(fallback).digest();
}

function encryptPayload(payload: unknown, secret?: string): string {
  const key = resolveSecretKey(secret);
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(CIPHER, key, iv, {
    authTagLength: AUTH_TAG_SIZE,
  });
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    toBase64Url(iv),
    toBase64Url(ciphertext),
    toBase64Url(authTag),
  ].join('.');
}

function decryptPayload<T>(token: string, secret?: string): T | null {
  try {
    const [version, ivPart, ciphertextPart, authTagPart] = token.split('.');
    if (
      version !== TOKEN_VERSION ||
      !ivPart ||
      !ciphertextPart ||
      !authTagPart
    ) {
      return null;
    }

    const key = resolveSecretKey(secret);
    const iv = fromBase64Url(ivPart);
    const ciphertext = fromBase64Url(ciphertextPart);
    const authTag = fromBase64Url(authTagPart);

    const decipher = createDecipheriv(CIPHER, key, iv, {
      authTagLength: AUTH_TAG_SIZE,
    });
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function cleanupRevokedSessions(nowInSeconds: number) {
  for (const [jti, exp] of revokedSessionIds.entries()) {
    if (exp <= nowInSeconds) {
      revokedSessionIds.delete(jti);
    }
  }
}

function isSessionRevoked(jti: string, nowInSeconds: number): boolean {
  cleanupRevokedSessions(nowInSeconds);
  return revokedSessionIds.has(jti);
}

export function parseCookieHeader(
  cookieHeader: string | null,
): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  for (const chunk of cookieHeader.split(';')) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    parsed[key] = decodeURIComponent(value);
  }

  return parsed;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
    path?: string;
  } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  const path = options.path ?? '/';
  parts.push(`Path=${path}`);

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly ?? true) {
    parts.push('HttpOnly');
  }

  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);

  const secure =
    typeof options.secure === 'boolean'
      ? options.secure
      : process.env.NODE_ENV === 'production';
  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function encryptProviderCredentialStore(
  store: ProviderCredentialStore,
  secret?: string,
): string {
  return encryptPayload(store, secret);
}

export function decryptProviderCredentialStore(
  encryptedStore: string | undefined,
  secret?: string,
): ProviderCredentialStore {
  if (!encryptedStore || encryptedStore.trim().length === 0) return {};
  const parsed = decryptPayload<ProviderCredentialStore>(
    encryptedStore,
    secret,
  );
  return parsed ?? {};
}

export function readProviderCredentialStoreFromRequest(
  request: Request,
  options: StoreSecretOptions = {},
): ProviderCredentialStore {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return decryptProviderCredentialStore(
    cookies[AI_PROVIDER_STORE_COOKIE_NAME],
    options.secret,
  );
}

export function buildProviderCredentialStoreSetCookie(
  store: ProviderCredentialStore,
  options: StoreSecretOptions & {
    maxAgeSeconds?: number;
  } = {},
): string {
  const encrypted = encryptProviderCredentialStore(store, options.secret);
  return serializeCookie(AI_PROVIDER_STORE_COOKIE_NAME, encrypted, {
    maxAge: options.maxAgeSeconds ?? 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
}

export function sanitizeStoredProviderCredential(
  credential: StoredProviderCredential,
): Omit<
  StoredProviderCredential,
  'apiKey' | 'oauthAccessToken' | 'oauthRefreshToken'
> & {
  hasApiKey: boolean;
  hasOauthAccessToken: boolean;
  hasOauthRefreshToken: boolean;
} {
  return {
    providerId: credential.providerId,
    model: credential.model,
    authMode: credential.authMode,
    hasApiKey: Boolean(credential.apiKey),
    hasOauthAccessToken: Boolean(credential.oauthAccessToken),
    hasOauthRefreshToken: Boolean(credential.oauthRefreshToken),
    oauthExpiresAt: credential.oauthExpiresAt,
    chatGptAccountId: credential.chatGptAccountId,
    baseURL: credential.baseURL,
    region: credential.region,
    organization: credential.organization,
    project: credential.project,
    headers: credential.headers,
    updatedAt: credential.updatedAt,
  };
}

export function createProviderOauthStateToken(
  payload: ProviderOauthStatePayload,
  secret?: string,
): string {
  return encryptPayload(payload, secret);
}

export function decodeProviderOauthStateToken(
  token: string | null | undefined,
  options: SessionDecodeOptions = {},
): ProviderOauthStatePayload | null {
  if (!token || token.trim().length === 0) return null;
  const payload = decryptPayload<ProviderOauthStatePayload>(
    token,
    options.secret,
  );
  if (!payload) return null;
  const nowInSeconds = resolveNowInSeconds(options.now);
  if (payload.expiresAt <= nowInSeconds) return null;
  return payload;
}

export function buildProviderOauthStateSetCookie(
  payload: ProviderOauthStatePayload,
  options: StoreSecretOptions & {
    maxAgeSeconds?: number;
  } = {},
): string {
  const token = createProviderOauthStateToken(payload, options.secret);
  return serializeCookie(AI_PROVIDER_OAUTH_STATE_COOKIE_NAME, token, {
    maxAge: options.maxAgeSeconds ?? 10 * 60,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
}

export function buildProviderOauthStateClearCookie(): string {
  return serializeCookie(AI_PROVIDER_OAUTH_STATE_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
}

export function readProviderOauthStateFromRequest(
  request: Request,
  options: SessionDecodeOptions = {},
): ProviderOauthStatePayload | null {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return decodeProviderOauthStateToken(
    cookies[AI_PROVIDER_OAUTH_STATE_COOKIE_NAME],
    options,
  );
}

export function createAiAuthSessionToken(
  provider: AssistantProviderConfig,
  options: SessionTokenOptions = {},
): string {
  const nowInSeconds = resolveNowInSeconds(options.now);
  const ttlSeconds = Math.max(60, Math.min(options.ttlSeconds ?? 3600, 86400));
  const payload: AiAuthSessionPayload = {
    jti: nanoid(20),
    iat: nowInSeconds,
    exp: nowInSeconds + ttlSeconds,
    provider,
  };

  return encryptPayload(payload, options.secret);
}

export function decodeAiAuthSessionToken(
  token: string | null | undefined,
  options: SessionDecodeOptions = {},
): AiAuthSessionPayload | null {
  if (!token || token.trim().length === 0) return null;

  const nowInSeconds = resolveNowInSeconds(options.now);
  const payload = decryptPayload<AiAuthSessionPayload>(token, options.secret);
  if (!payload) return null;
  if (payload.exp <= nowInSeconds) return null;
  if (!payload.jti || isSessionRevoked(payload.jti, nowInSeconds)) return null;

  return payload;
}

export function revokeAiAuthSessionToken(
  token: string | null | undefined,
  options: SessionDecodeOptions = {},
): boolean {
  if (!token || token.trim().length === 0) return false;

  const nowInSeconds = resolveNowInSeconds(options.now);
  const payload = decryptPayload<AiAuthSessionPayload>(token, options.secret);
  if (!payload) return false;
  if (!payload.jti) return false;
  if (payload.exp <= nowInSeconds) return false;

  revokedSessionIds.set(payload.jti, payload.exp);
  cleanupRevokedSessions(nowInSeconds);
  return true;
}

export function extractBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization');
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return undefined;
  if (scheme.toLowerCase() !== 'bearer') return undefined;
  return token.trim() || undefined;
}
