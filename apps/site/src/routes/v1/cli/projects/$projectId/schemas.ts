import { createFileRoute } from '@tanstack/react-router';
import { handleCliProjectSchemasRequest } from '@/lib/plugins/cli-sync-api';

export const Route = createFileRoute('/v1/cli/projects/$projectId/schemas')({
  server: {
    handlers: {
      GET: async ({ request }) => handleCliProjectSchemasRequest(request),
      PUT: async ({ request }) => handleCliProjectSchemasRequest(request),
    },
  },
});
