import { createServerFn } from '@tanstack/react-start';
import { getHeader } from 'vinxi/http';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const executeBoyaiPrompt = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ prompt: z.string(), model: z.string().optional(), apiKey: z.string() }))
  .handler(async ({ data: { prompt, model, apiKey } }) => {
    // TanStack Start client proxy doesn't easily support custom HTTP headers.
    // We accept it via the secure encrypted POST payload instead.
    const rawApiKey = apiKey || getHeader('X-Boyai-Key') || getHeader('x-boyai-key');

    if (!rawApiKey) {
      throw new Error('Unauthorized: Missing API key.');
    }

    // Initialize the provider with the user's BYO key
    const google = createGoogleGenerativeAI({
      apiKey: rawApiKey,
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

export const testBoyaiConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ apiKey: z.string() }))
  .handler(async ({ data: { apiKey } }) => {
    const rawApiKey = apiKey || getHeader('X-Boyai-Key') || getHeader('x-boyai-key');

    if (!rawApiKey) {
      throw new Error('Unauthorized: Missing API key.');
    }

    try {
      // Use native fetch to bypass any @ai-sdk/google initialization errors
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${rawApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with exactly: Connection successful" }] }]
        })
      });

      const data = await res.json() as any;

      if (!res.ok) {
        throw new Error(data.error?.message || 'Connection test failed. Please check your API key.');
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Connection successful';
      return { success: true, text };
    } catch (error) {
      console.error('AI Proxy Connection Test Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Connection test failed. Please check your API key.');
    }
  }
);
