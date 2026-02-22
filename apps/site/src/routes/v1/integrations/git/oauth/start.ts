import { createFileRoute } from '@tanstack/react-router';
import { handleGitOauthStartRequest } from '@/lib/integrations/git-integration-api';

export const Route = createFileRoute('/v1/integrations/git/oauth/start')({
  server: {
    handlers: {
      GET: async ({ request }) => handleGitOauthStartRequest(request),
    },
  },
});
