import { createFileRoute } from '@tanstack/react-router';
import { handleGitRepositoriesRequest } from '@/lib/integrations/git-integration-api';

export const Route = createFileRoute('/v1/integrations/git/repositories')({
  server: {
    handlers: {
      GET: async ({ request }) => handleGitRepositoriesRequest(request),
      DELETE: async ({ request }) => handleGitRepositoriesRequest(request),
    },
  },
});
