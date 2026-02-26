import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  type AssistantProviderConfig,
  createAssistantLanguageModel,
  normalizeAssistantProviderConfig,
} from '@/lib/ai/business-onboarding-provider-runtime';
import {
  AI_PROVIDER_STORE_COOKIE_NAME,
  decryptProviderCredentialStore,
  encryptProviderCredentialStore,
  type ProviderCredentialStore,
  type StoredProviderCredential,
} from '@/lib/ai/provider-auth-store';
import { refreshProviderCredentialIfNeeded } from '@/lib/ai/provider-oauth-refresh';
import {
  createVisionFallbackState,
  runVisionFallback,
  type VisionFallbackFeatureFlags,
  type VisionFallbackState,
  type VisionPayload,
  type VisionProviderPath,
  type VisionProviderRequest,
  type VisionProviderResult,
} from '@/lib/datamatrix/vision-fallback';

const visionFallbackStateSchema: z.ZodType<VisionFallbackState> = z.object({
  budget: z.object({
    perScanAttemptCalls: z.record(z.string(), z.number().int().nonnegative()),
    perSessionCalls: z.record(z.string(), z.number().int().nonnegative()),
    dedupeByProviderHash: z.record(z.string(), z.number().int().nonnegative()),
  }),
  uploadsByScanAttempt: z.record(
    z.string(),
    z.object({
      uploadId: z.string(),
      uploadedAt: z.number().int().nonnegative(),
      byteLength: z.number().int().nonnegative(),
    }),
  ),
});

const featureFlagsSchema: z.ZodType<VisionFallbackFeatureFlags> = z.object({
  officialEnabled: z.boolean(),
  optionalEnabled: z.boolean(),
});

const datamatrixVisionInputSchema = z.object({
  sessionId: z.string().min(1),
  scanAttemptId: z.string().min(1),
  scanPayload: z.string().min(1),
  imageBase64: z.string().optional(),
  occurredAt: z
    .number()
    .int()
    .nonnegative()
    .default(() => Date.now()),
  providerPreference: z.enum(['auto', 'official', 'optional']).default('auto'),
  aiBudgetPolicy: z
    .object({
      maxCallsPerScanAttempt: z.number().int().positive().optional(),
      maxCallsPerSession: z.number().int().positive().optional(),
      dedupeWindowMs: z.number().int().positive().optional(),
    })
    .optional(),
  providerTimeoutMs: z.number().int().positive().max(60_000).optional(),
  featureFlags: featureFlagsSchema.optional(),
  state: visionFallbackStateSchema.optional(),
});

const datamatrixVisionStructuredOutputSchema = z.object({
  summary: z.string().trim().min(1).max(320),
  payload: z.record(z.string(), z.unknown()).nullable().default(null),
});

const DATAMATRIX_VISION_DEFAULT_PROVIDER: Record<VisionProviderPath, string> = {
  official: 'openai',
  optional: 'openrouter',
};

const DATAMATRIX_VISION_DEFAULT_MODEL: Record<VisionProviderPath, string> = {
  official: 'gpt-5-mini',
  optional: 'openai/gpt-5',
};

const DATAMATRIX_VISION_PROVIDER_ID_ENV: Record<VisionProviderPath, string> = {
  official: 'DATAMATRIX_V2_VISION_OFFICIAL_PROVIDER_ID',
  optional: 'DATAMATRIX_V2_VISION_OPTIONAL_PROVIDER_ID',
};

const DATAMATRIX_VISION_MODEL_ENV: Record<VisionProviderPath, string> = {
  official: 'DATAMATRIX_V2_VISION_OFFICIAL_MODEL',
  optional: 'DATAMATRIX_V2_VISION_OPTIONAL_MODEL',
};

const DATAMATRIX_VISION_BASE_URL_ENV: Record<VisionProviderPath, string> = {
  official: 'DATAMATRIX_V2_VISION_OFFICIAL_BASE_URL',
  optional: 'DATAMATRIX_V2_VISION_OPTIONAL_BASE_URL',
};

const DATAMATRIX_VISION_MAX_OUTPUT_TOKENS_ENV =
  'DATAMATRIX_V2_VISION_MAX_OUTPUT_TOKENS';
const DATAMATRIX_VISION_TEMPERATURE_ENV = 'DATAMATRIX_V2_VISION_TEMPERATURE';
const DATAMATRIX_VISION_DEFAULT_MAX_OUTPUT_TOKENS = 480;
const DATAMATRIX_VISION_DEFAULT_TEMPERATURE = 0;

function readEnvString(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoundedNumberFromEnv(args: {
  key: string;
  fallback: number;
  min: number;
  max: number;
}) {
  const raw = readEnvString(args.key);
  if (!raw) {
    return args.fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return args.fallback;
  }
  return Math.min(args.max, Math.max(args.min, parsed));
}

function pickMostRecentlyUpdatedCredential(
  store: ProviderCredentialStore,
): StoredProviderCredential | null {
  const allCredentials = Object.values(store);
  if (allCredentials.length === 0) {
    return null;
  }
  return [...allCredentials].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }
    return a.providerId.localeCompare(b.providerId);
  })[0];
}

export function resolveVisionProviderConfig(input: {
  providerPath: VisionProviderPath;
  providerStore: ProviderCredentialStore;
}) {
  const explicitProviderId = readEnvString(
    DATAMATRIX_VISION_PROVIDER_ID_ENV[input.providerPath],
  );
  const providerFromStore = explicitProviderId
    ? input.providerStore[explicitProviderId]
    : null;
  const defaultFromStore =
    input.providerStore[DATAMATRIX_VISION_DEFAULT_PROVIDER[input.providerPath]];
  const selectedStoredCredential =
    providerFromStore ??
    defaultFromStore ??
    pickMostRecentlyUpdatedCredential(input.providerStore);

  const providerId =
    explicitProviderId ??
    selectedStoredCredential?.providerId ??
    DATAMATRIX_VISION_DEFAULT_PROVIDER[input.providerPath];
  const model =
    readEnvString(DATAMATRIX_VISION_MODEL_ENV[input.providerPath]) ??
    selectedStoredCredential?.model ??
    DATAMATRIX_VISION_DEFAULT_MODEL[input.providerPath];
  const baseURL =
    readEnvString(DATAMATRIX_VISION_BASE_URL_ENV[input.providerPath]) ??
    selectedStoredCredential?.baseURL;

  const normalizedProvider = normalizeAssistantProviderConfig(
    {
      ...(selectedStoredCredential ?? {}),
      providerId,
      model,
      baseURL,
    },
    model,
  );

  return {
    provider: normalizedProvider,
    selectedStoredCredential,
  };
}

function persistProviderStore(store: ProviderCredentialStore) {
  setCookie(
    AI_PROVIDER_STORE_COOKIE_NAME,
    encryptProviderCredentialStore(store),
    {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  );
}

function buildVisionPrompt(input: VisionProviderRequest) {
  return [
    'You are the DataMatrix fallback parser for non-deterministic scans.',
    'Summarize the scan and return a compact machine-readable payload when possible.',
    'If uncertain, keep payload null and explain uncertainty briefly.',
    `provider_path: ${input.providerPath}`,
    `scan_hash: ${input.scanHash}`,
    `session_id: ${input.sessionId}`,
    `scan_attempt_id: ${input.scanAttemptId}`,
    `upload_id: ${input.upload?.uploadId ?? 'none'}`,
    `scan_payload:\n${input.scanPayload}`,
  ].join('\n\n');
}

export async function runAiVisionProvider(args: {
  request: VisionProviderRequest;
  providerConfig: AssistantProviderConfig;
  temperature: number;
  maxOutputTokens: number;
}): Promise<VisionProviderResult> {
  const model = createAssistantLanguageModel(args.providerConfig);
  if (!model) {
    return {
      status: 'unavailable',
      reason: 'provider_not_configured',
      providerId: args.providerConfig.providerId,
    };
  }

  try {
    const { object } = await generateObject({
      // biome-ignore lint/suspicious/noExplicitAny: ai sdk model contract
      model: model as any,
      schema: datamatrixVisionStructuredOutputSchema,
      temperature: args.temperature,
      maxOutputTokens: args.maxOutputTokens,
      prompt: buildVisionPrompt(args.request),
    });

    return {
      status: 'success',
      providerId: args.providerConfig.providerId,
      model: args.providerConfig.model,
      summary: object.summary,
      payload: object.payload as VisionPayload | null,
    };
  } catch (error) {
    console.error('DataMatrix vision provider invocation failed.', {
      providerId: args.providerConfig.providerId,
      providerPath: args.request.providerPath,
      message: error instanceof Error ? error.message : 'unknown_error',
    });

    return {
      status: 'unavailable',
      reason: 'provider_runtime_error',
      providerId: args.providerConfig.providerId,
    };
  }
}

export const runDataMatrixVisionFallback = createServerFn({ method: 'POST' })
  .inputValidator(datamatrixVisionInputSchema)
  .handler(async ({ data }) => {
    const seedState = data.state ?? createVisionFallbackState();
    const providerStore = decryptProviderCredentialStore(
      getCookie(AI_PROVIDER_STORE_COOKIE_NAME),
    );
    const cachedProviderByPath = new Map<
      VisionProviderPath,
      AssistantProviderConfig
    >();
    const maxOutputTokens = readBoundedNumberFromEnv({
      key: DATAMATRIX_VISION_MAX_OUTPUT_TOKENS_ENV,
      fallback: DATAMATRIX_VISION_DEFAULT_MAX_OUTPUT_TOKENS,
      min: 64,
      max: 2_048,
    });
    const temperature = readBoundedNumberFromEnv({
      key: DATAMATRIX_VISION_TEMPERATURE_ENV,
      fallback: DATAMATRIX_VISION_DEFAULT_TEMPERATURE,
      min: 0,
      max: 2,
    });

    const outcome = await runVisionFallback(
      {
        sessionId: data.sessionId,
        scanAttemptId: data.scanAttemptId,
        scanPayload: data.scanPayload,
        imageBase64: data.imageBase64,
        occurredAt: data.occurredAt,
        providerPreference: data.providerPreference,
        aiBudgetPolicy: data.aiBudgetPolicy,
        featureFlags: data.featureFlags,
        providerTimeoutMs: data.providerTimeoutMs,
      },
      seedState,
      {
        runVisionProvider: async (request) => {
          const cachedProvider = cachedProviderByPath.get(request.providerPath);
          const providerConfig =
            cachedProvider ??
            resolveVisionProviderConfig({
              providerPath: request.providerPath,
              providerStore,
            }).provider;
          const refreshAttempt = await refreshProviderCredentialIfNeeded(
            providerConfig,
            {
              nowInSeconds: Math.floor(Date.now() / 1_000),
              model: providerConfig.model,
            },
          );

          const refreshedProvider = refreshAttempt.provider;
          cachedProviderByPath.set(request.providerPath, refreshedProvider);

          if (refreshAttempt.refreshed) {
            const existing = providerStore[refreshedProvider.providerId];
            if (existing) {
              providerStore[refreshedProvider.providerId] = {
                ...existing,
                oauthAccessToken: refreshedProvider.oauthAccessToken,
                oauthRefreshToken: refreshedProvider.oauthRefreshToken,
                oauthExpiresAt: refreshedProvider.oauthExpiresAt,
                chatGptAccountId: refreshedProvider.chatGptAccountId,
                baseURL: refreshedProvider.baseURL ?? existing.baseURL,
                headers: refreshedProvider.headers ?? existing.headers,
                updatedAt: Math.floor(Date.now() / 1_000),
              };
              persistProviderStore(providerStore);
            }
          }

          return runAiVisionProvider({
            request,
            providerConfig: refreshedProvider,
            temperature,
            maxOutputTokens,
          });
        },
      },
    );

    return {
      state: outcome.state,
      response: outcome.response,
    };
  });
