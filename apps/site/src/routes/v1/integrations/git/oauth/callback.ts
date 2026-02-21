import { createFileRoute } from '@tanstack/react-router';
import { handleGitOauthCallbackRequest } from '@/lib/integrations/git-integration-api';

export const Route = createFileRoute('/v1/integrations/git/oauth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => handleGitOauthCallbackRequest(request),
    },
  },
});
