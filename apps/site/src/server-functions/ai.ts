import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  resolveAssistantModelOption,
} from '@/lib/ai/business-onboarding-models';
import {
  type AssistantProviderConfig,
  assistantProviderConfigSchema,
  createAssistantLanguageModel,
  normalizeAssistantProviderConfig,
} from '@/lib/ai/business-onboarding-provider-runtime';
import {
  AI_PROVIDER_STORE_COOKIE_NAME,
  decodeAiAuthSessionToken,
  decryptProviderCredentialStore,
  encryptProviderCredentialStore,
} from '@/lib/ai/provider-auth-store';
import { refreshProviderCredentialIfNeeded } from '@/lib/ai/provider-oauth-refresh';
import { buildAssistantFallbackResponse } from '@/lib/business-ai-assistant';

const assistantResponseSchema = z.object({
  assistantMessage: z.string(),
  quickOptions: z.object({
    questionId: z.string(),
    prompt: z.string(),
    options: z.tuple([z.string(), z.string(), z.string()]),
    otherOptionLabel: z.string(),
  }),
  suggestedReleaseIds: z.array(z.string()),
  scaffoldProposal: z
    .object({
      title: z.string(),
      reason: z.string(),
    })
    .nullable(),
  todoItems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      done: z.boolean(),
    }),
  ),
});

const assistantTurnInputSchema = z.object({
  providerApiKey: z.string().optional(),
  model: z.string().default(DEFAULT_BUSINESS_ONBOARDING_MODEL_ID),
  provider: assistantProviderConfigSchema.optional(),
  authSessionToken: z.string().optional(),
  userPrompt: z.string(),
  selectedReleaseIds: z.array(z.string()).default([]),
  availableReleaseIds: z.array(z.string()).default([]),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
});

export const getBusinessCreationAssistantTurn = createServerFn({
  method: 'POST',
})
  .inputValidator(assistantTurnInputSchema)
  .handler(async ({ data }) => {
    const fallback = buildAssistantFallbackResponse({
      selectedReleaseIds: data.selectedReleaseIds,
      availableReleaseIds: data.availableReleaseIds,
      prompt: data.userPrompt,
    });

    const sessionProvider = decodeAiAuthSessionToken(data.authSessionToken, {
      now: Math.floor(Date.now() / 1000),
    })?.provider;
    const legacyModelOption = resolveAssistantModelOption(data.model);
    const provider = normalizeAssistantProviderConfig(
      data.provider ??
        sessionProvider ?? {
          providerId: legacyModelOption.provider,
          model: data.model,
          apiKey: data.providerApiKey,
        },
      data.model,
    );

    const providerStore = decryptProviderCredentialStore(
      getCookie(AI_PROVIDER_STORE_COOKIE_NAME),
    );
    const storedCredential = providerStore[provider.providerId];
    const providerFromStore: AssistantProviderConfig | null =
      storedCredential &&
      !provider.apiKey &&
      !provider.oauthAccessToken &&
      !sessionProvider
        ? normalizeAssistantProviderConfig(
            {
              ...storedCredential,
              ...provider,
              model: provider.model || storedCredential.model,
            },
            provider.model,
          )
        : null;

    let normalizedProvider =
      !provider.apiKey && data.providerApiKey
        ? {
            ...(providerFromStore ?? provider),
            apiKey: data.providerApiKey.trim() || undefined,
          }
        : (providerFromStore ?? provider);

    const nowInSeconds = Math.floor(Date.now() / 1000);

    try {
      const refreshedProvider = await refreshProviderCredentialIfNeeded(
        normalizedProvider,
        {
          nowInSeconds,
          model: normalizedProvider.model,
        },
      );
      normalizedProvider = refreshedProvider.provider;

      if (refreshedProvider.refreshed && storedCredential) {
        providerStore[storedCredential.providerId] = {
          ...storedCredential,
          oauthAccessToken: normalizedProvider.oauthAccessToken,
          oauthRefreshToken: normalizedProvider.oauthRefreshToken,
          oauthExpiresAt: normalizedProvider.oauthExpiresAt,
          chatGptAccountId: normalizedProvider.chatGptAccountId,
          baseURL: normalizedProvider.baseURL ?? storedCredential.baseURL,
          headers: normalizedProvider.headers ?? storedCredential.headers,
          updatedAt: nowInSeconds,
        };

        setCookie(
          AI_PROVIDER_STORE_COOKIE_NAME,
          encryptProviderCredentialStore(providerStore),
          {
            maxAge: 60 * 60 * 24 * 30,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
          },
        );
      }

      const model = createAssistantLanguageModel(normalizedProvider);
      if (!model) return fallback;

      const contextHistory = data.conversationHistory
        .slice(-8)
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n');

      const { object } = await generateObject({
        // biome-ignore lint/suspicious/noExplicitAny: ai sdk generic model interface
        model: model as any,
        schema: assistantResponseSchema,
        prompt: [
          'You are a business onboarding assistant inside a business creation wizard.',
          'Focus first on understanding what business the user runs and what it does daily.',
          'Ask concise follow-up questions, one step at a time, and keep the tone conversational.',
          'Do not ask users to manually browse or install plugins. If relevant, suggest release IDs directly.',
          'Return strict JSON only, matching the schema.',
          `Provider selected: ${normalizedProvider.providerId}`,
          `Model selected: ${normalizedProvider.model}`,
          `Available release IDs (choose only from these): ${data.availableReleaseIds.join(', ') || 'none'}`,
          `Already selected release IDs: ${data.selectedReleaseIds.join(', ') || 'none'}`,
          `Conversation history:\n${contextHistory || 'none'}`,
          `Latest user message: ${data.userPrompt}`,
          'Set scaffoldProposal only when no available release IDs match the request.',
        ].join('\n\n'),
      });

      return {
        ...object,
        suggestedReleaseIds: object.suggestedReleaseIds.filter((releaseId) =>
          data.availableReleaseIds.includes(releaseId),
        ),
      };
    } catch {
      return fallback;
    }
  });
