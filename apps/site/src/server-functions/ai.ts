import { createServerFn } from '@tanstack/react-start';
import { generateObject } from 'ai';
import { z } from 'zod';
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
  model: z.string().default('gpt-4o-mini'),
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

    const apiKey = data.providerApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return fallback;

    try {
      const moduleName = '@ai-sdk/openai';
      const openaiModule = (await import(moduleName)) as {
        createOpenAI?: (config: {
          apiKey: string;
        }) => (model: string) => unknown;
      };

      if (!openaiModule.createOpenAI) return fallback;
      const openai = openaiModule.createOpenAI({ apiKey });

      const contextHistory = data.conversationHistory
        .slice(-8)
        .map((message) => `${message.role}: ${message.content}`)
        .join('\n');

      const { object } = await generateObject({
        // biome-ignore lint/suspicious/noExplicitAny: dynamic provider model contract
        model: openai(data.model) as any,
        schema: assistantResponseSchema,
        prompt: [
          'You are a business onboarding AI assistant for plugin recommendations.',
          'Return JSON only matching the schema.',
          'Use multi-step questioning and keep options keyboard-friendly.',
          'The onboarding flow is plugin-first (no fixed business-type presets).',
          `Available release IDs (choose only from these): ${data.availableReleaseIds.join(', ') || 'none'}`,
          `Already selected release IDs: ${data.selectedReleaseIds.join(', ') || 'none'}`,
          `Conversation history:\n${contextHistory || 'none'}`,
          `Latest user message: ${data.userPrompt}`,
          'If no exact plugin exists, provide scaffoldProposal.',
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
