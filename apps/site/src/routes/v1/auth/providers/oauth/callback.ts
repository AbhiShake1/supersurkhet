import { createFileRoute } from '@tanstack/react-router';
import { handleProviderOauthCallbackRequest } from '@/lib/ai/provider-auth-api';

export const Route = createFileRoute('/v1/auth/providers/oauth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => handleProviderOauthCallbackRequest(request),
      POST: async ({ request }) => handleProviderOauthCallbackRequest(request),
    },
  },
});
