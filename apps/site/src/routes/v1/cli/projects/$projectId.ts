import { createFileRoute } from '@tanstack/react-router';
import { handleCliProjectRequest } from '@/lib/plugins/cli-sync-api';

export const Route = createFileRoute('/v1/cli/projects/$projectId')({
  server: {
    handlers: {
      GET: async ({ request }) => handleCliProjectRequest(request),
    },
  },
});
