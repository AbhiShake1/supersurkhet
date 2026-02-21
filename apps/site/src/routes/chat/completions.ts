import { createFileRoute } from '@tanstack/react-router';
import { createOpenAiCompatibleApiHandlers } from '@/lib/ai/openai-compatible-api';

const handlers = createOpenAiCompatibleApiHandlers();

export const Route = createFileRoute('/chat/completions')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handlers.handleChatCompletionsRequest(request),
    },
  },
});
