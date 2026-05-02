import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createServerFn } from '@tanstack/react-start';
import { generateText } from 'ai';
import { z } from 'zod';

/**
 * Executes a prompt against the user's BYO AI provider (Google Gemini).
 * Accepts apiKey via POST body only — TanStack Start client proxy
 * does not support custom HTTP headers.
 * apiKey is required and validated by Zod before the handler runs.
 */
export const executeBoyaiPrompt = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      prompt: z.string(),
      model: z.string().optional(),
      apiKey: z.string(),
    }),
  )
  .handler(async ({ data: { prompt, model, apiKey } }) => {
    // TanStack Start client proxy doesn't easily support custom HTTP headers.
    // We accept it via the secure encrypted POST payload instead.
    const google = createGoogleGenerativeAI({
      apiKey,
    });

    try {
      const { text } = await generateText({
        model: google(model || 'gemini-2.5-flash'), // Use selected model or default
        prompt: prompt,
        abortSignal: AbortSignal.timeout(10000),
      });

      return { text };
    } catch (error) {
      console.error('AI Proxy Error:', error);
      throw new Error('Failed to execute AI prompt.');
    }
  });

/**
 * Tests connectivity to the user's BYO AI provider.
 * Sends a minimal prompt to verify the API key is valid.
 * apiKey is required and validated by Zod before the handler runs.
 * Returns { success: true, text } on success.
 */
export const testBoyaiConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ apiKey: z.string() }))
  .handler(async ({ data: { apiKey } }) => {
    try {
      // Use native fetch to bypass any @ai-sdk/google initialization errors
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: 'Reply with exactly: Connection successful' }],
              },
            ],
          }),
        },
      );

      const data = (await res.json()) as {
        candidates?: { content: { parts: { text: string }[] } }[];
        error?: { message: string };
      };

      if (!res.ok) {
        throw new Error(
          data.error?.message ||
            'Connection test failed. Please check your API key.',
        );
      }

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Connection successful';
      return { success: true, text };
    } catch (error) {
      console.error('AI Proxy Connection Test Error:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Connection test failed. Please check your API key.',
      );
    }
  });
