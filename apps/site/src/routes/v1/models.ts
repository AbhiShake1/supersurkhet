import { createFileRoute } from '@tanstack/react-router';
import { createOpenAiCompatibleApiHandlers } from '@/lib/ai/openai-compatible-api';

const handlers = createOpenAiCompatibleApiHandlers();

export const Route = createFileRoute('/v1/models')({
  server: {
    handlers: {
      GET: async ({ request }) => handlers.handleModelsRequest(request),
    },
  },
});
