import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import * as TanstackQuery from './integrations/tanstack-query/root-provider';

import * as Sentry from '@sentry/tanstackstart-react';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Register service worker for offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log(
          'Service Worker registered with scope:',
          registration.scope,
        );
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext();

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
    },

    defaultPreload: 'intent',
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient: rqContext.queryClient,
  });

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [],
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
      defaultIntegrations: false,
    });
  }

  return router;
};
