import { createFileRoute } from '@tanstack/react-router';
import { handleProviderCredentialRequest } from '@/lib/ai/provider-auth-api';

export const Route = createFileRoute('/v1/auth/providers')({
  server: {
    handlers: {
      GET: async ({ request }) => handleProviderCredentialRequest(request),
      POST: async ({ request }) => handleProviderCredentialRequest(request),
      DELETE: async ({ request }) => handleProviderCredentialRequest(request),
    },
  },
});
