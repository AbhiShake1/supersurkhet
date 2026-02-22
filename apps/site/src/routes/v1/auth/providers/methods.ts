import { createFileRoute } from '@tanstack/react-router';
import { handleProviderAuthMethodsRequest } from '@/lib/ai/provider-auth-api';

export const Route = createFileRoute('/v1/auth/providers/methods')({
  server: {
    handlers: {
      GET: async ({ request }) => handleProviderAuthMethodsRequest(request),
    },
  },
});
