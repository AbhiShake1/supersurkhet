import { createFileRoute } from '@tanstack/react-router';
import { handleAuthSessionRequest } from '@/lib/ai/provider-auth-api';

export const Route = createFileRoute('/v1/auth/sessions')({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthSessionRequest(request),
      POST: async ({ request }) => handleAuthSessionRequest(request),
      DELETE: async ({ request }) => handleAuthSessionRequest(request),
    },
  },
});
