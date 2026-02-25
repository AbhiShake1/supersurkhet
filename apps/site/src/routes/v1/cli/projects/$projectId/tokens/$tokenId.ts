import { createFileRoute } from '@tanstack/react-router';
import { handleCliProjectTokenByIdRequest } from '@/lib/plugins/cli-sync-api';

export const Route = createFileRoute(
  '/v1/cli/projects/$projectId/tokens/$tokenId',
)({
  server: {
    handlers: {
      DELETE: async ({ request }) => handleCliProjectTokenByIdRequest(request),
    },
  },
});
