import { createFileRoute } from '@tanstack/react-router';
import { handleProviderOauthAuthorizeRequest } from '@/lib/ai/provider-auth-api';

export const Route = createFileRoute('/v1/auth/providers/oauth/authorize')({
  server: {
    handlers: {
      POST: async ({ request }) => handleProviderOauthAuthorizeRequest(request),
    },
  },
});
