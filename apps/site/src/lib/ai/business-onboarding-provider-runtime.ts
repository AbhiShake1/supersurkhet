import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import {
  type AssistantAuthMode,
  type BusinessOnboardingProviderId,
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  resolveAssistantModelOption,
  resolveProviderApiKeyFromEnv,
  resolveProviderDefaultAuthMode,
  resolveProviderDefaultBaseUrl,
  resolveProviderSupportedAuthModes,
} from './business-onboarding-models';

export const assistantProviderIdSchema = z.string().trim().min(1);

export const assistantAuthModeSchema = z.enum([
  'api-key',
  'oauth-access-token',
  'aws-credential-chain',
  'none',
]);

export const assistantProviderConfigSchema = z.object({
  providerId: assistantProviderIdSchema.optional(),
  model: z.string().optional(),
  authMode: assistantAuthModeSchema.optional(),
  apiKey: z.string().optional(),
  oauthAccessToken: z.string().optional(),
  oauthRefreshToken: z.string().optional(),
  oauthExpiresAt: z.number().int().optional(),
  chatGptAccountId: z.string().optional(),
  baseURL: z.string().optional(),
  region: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export type AssistantProviderConfig = {
  providerId: BusinessOnboardingProviderId;
  model: string;
  authMode: AssistantAuthMode;
  apiKey?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: number;
  chatGptAccountId?: string;
  baseURL?: string;
  region?: string;
  organization?: string;
  project?: string;
  headers?: Record<string, string>;
};

type NormalizeAssistantProviderConfigInput = z.input<
  typeof assistantProviderConfigSchema
>;

export function normalizeAssistantProviderConfig(
  input: NormalizeAssistantProviderConfigInput | undefined,
  legacyModelId?: string,
): AssistantProviderConfig {
  const parsed = assistantProviderConfigSchema.parse(input ?? {});
  const resolvedModel = resolveAssistantModelOption(
    parsed.model ?? legacyModelId ?? DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  );
  const providerId = (parsed.providerId?.trim() ||
    resolvedModel.provider) as BusinessOnboardingProviderId;
  const authModes = resolveProviderSupportedAuthModes(providerId);
  const authMode =
    parsed.authMode && authModes.includes(parsed.authMode)
      ? parsed.authMode
      : resolveProviderDefaultAuthMode(providerId);
  const accountId = parsed.chatGptAccountId?.trim() || undefined;
  const headers = mergeHeaders(parsed.headers, {
    'ChatGPT-Account-Id': accountId,
  });

  return {
    providerId,
    model: parsed.model ?? resolvedModel.id,
    authMode,
    apiKey: parsed.apiKey?.trim() || undefined,
    oauthAccessToken: parsed.oauthAccessToken?.trim() || undefined,
    oauthRefreshToken: parsed.oauthRefreshToken?.trim() || undefined,
    oauthExpiresAt: parsed.oauthExpiresAt,
    chatGptAccountId: accountId,
    baseURL:
      parsed.baseURL?.trim() || resolveProviderDefaultBaseUrl(providerId),
    region: parsed.region?.trim() || process.env.AWS_REGION || undefined,
    organization: parsed.organization?.trim() || undefined,
    project: parsed.project?.trim() || undefined,
    headers,
  };
}

function mergeHeaders(
  base: Record<string, string> | undefined,
  additions: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const next: Record<string, string> = {
    ...(base ?? {}),
  };
  for (const [key, value] of Object.entries(additions)) {
    if (typeof value === 'string' && value.length > 0) {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function resolveCredential(
  config: AssistantProviderConfig,
): string | undefined {
  if (
    config.authMode === 'none' ||
    config.authMode === 'aws-credential-chain'
  ) {
    return undefined;
  }

  if (config.authMode === 'oauth-access-token') {
    return (
      config.oauthAccessToken ??
      config.apiKey ??
      resolveProviderApiKeyFromEnv(config.providerId)
    );
  }

  return config.apiKey ?? resolveProviderApiKeyFromEnv(config.providerId);
}

export function createAssistantLanguageModel(
  config: AssistantProviderConfig,
): LanguageModel | null {
  const credential = resolveCredential(config);

  switch (config.providerId) {
    case 'openai': {
      if (!credential) return null;

      const openai = createOpenAI({
        apiKey: credential,
        baseURL: config.baseURL,
        organization: config.organization,
        project: config.project,
        headers: config.headers,
      });

      return openai(config.model);
    }

    case 'anthropic': {
      if (!credential) return null;

      const anthropic = createAnthropic({
        apiKey: config.authMode === 'api-key' ? credential : undefined,
        authToken:
          config.authMode === 'oauth-access-token' ? credential : undefined,
        baseURL: config.baseURL,
        headers: config.headers,
      });

      return anthropic(config.model);
    }

    case 'google': {
      const googleHeaders = mergeHeaders(config.headers, {
        Authorization:
          config.authMode === 'oauth-access-token' && credential
            ? `Bearer ${credential}`
            : undefined,
      });

      const google = createGoogleGenerativeAI({
        apiKey: config.authMode === 'api-key' ? credential : undefined,
        baseURL: config.baseURL,
        headers: googleHeaders,
      });

      // Google Generative AI requires specific model IDs. 
      // Mapping common short names to their '-latest' or valid counterparts if needed.
      let modelId = config.model;
      if (modelId === 'gemini-1.5-pro') modelId = 'gemini-1.5-pro-latest';
      else if (modelId === 'gemini-1.5-flash') modelId = 'gemini-1.5-flash-latest';

      return google(modelId);
    }

    case 'bedrock':
    case 'amazon-bedrock': {
      const bedrock = createAmazonBedrock({
        region: config.region,
        baseURL: config.baseURL,
        apiKey:
          config.authMode === 'api-key' ||
          config.authMode === 'oauth-access-token'
            ? credential
            : undefined,
        headers: config.headers,
      });

      return bedrock(config.model);
    }

    default: {
      const baseURL =
        config.baseURL ??
        (config.providerId === 'custom-openai-compatible'
          ? process.env.OPENAI_COMPATIBLE_BASE_URL
          : resolveProviderDefaultBaseUrl(config.providerId));
      if (!baseURL) return null;

      const compatible = createOpenAICompatible({
        name: config.providerId,
        baseURL,
        apiKey: credential,
        headers: config.headers,
      });
      return compatible(config.model);
    }
  }
}
