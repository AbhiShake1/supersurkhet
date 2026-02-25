import { createFileRoute } from '@tanstack/react-router';
import { handleCliProjectTokensRequest } from '@/lib/plugins/cli-sync-api';

export const Route = createFileRoute('/v1/cli/projects/$projectId/tokens')({
  server: {
    handlers: {
      GET: async ({ request }) => handleCliProjectTokensRequest(request),
      POST: async ({ request }) => handleCliProjectTokensRequest(request),
    },
  },
});
