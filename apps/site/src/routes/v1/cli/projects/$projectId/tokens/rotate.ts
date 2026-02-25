import { createFileRoute } from '@tanstack/react-router';
import { handleCliProjectTokenRotateRequest } from '@/lib/plugins/cli-sync-api';

export const Route = createFileRoute(
  '/v1/cli/projects/$projectId/tokens/rotate',
)({
  server: {
    handlers: {
      POST: async ({ request }) => handleCliProjectTokenRotateRequest(request),
    },
  },
});
