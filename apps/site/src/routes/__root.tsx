import '@/lib/monkey-patches';
import { DismissableLayerBranch } from '@radix-ui/react-dismissable-layer';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Agentation } from 'agentation';
import type { IGunUserInstance } from 'gun/types';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { useEffect } from 'react';
import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';
import z from 'zod';
import { AuthProvider } from '@/components/auth-provider';
import { ConfettiProvider } from '@/components/confetti-provider';
import { LoginPromptProvider } from '@/components/login-prompt-provider';
import { ErrorComponent } from '@/components/ui/error';
import { NotFound } from '@/components/ui/not-found';
import { Toaster } from '@/components/ui/sonner';
import { UserLoading } from '@/components/ui/user-loading';
import { DialogProvider, DrawerProvider } from '@/contexts/dialog-context';
import { I18nProvider } from '@/contexts/i18n-context';
// import { QRScannerButton } from "@/components/ui/qr-scanner-button";
// import { toast } from "sonner";
// import type { DataMatrixAction } from "@/lib/datamatrix";
import {
  getAppDarkMode,
  getAppTheme,
  getAppThemeData,
  resolveDarkModePreference,
  ThemeProvider as ThemeModeProvider,
} from '@/contexts/theme-context';
import {
  GoogleLoginProvider,
  OneTapLoginProvider,
} from '@/integrations/google/google-login-provider';
import {
  isDataMatrixDeviceCallbackMessage,
  parseExpoBridgeMessageAndUnwrap,
} from '@/lib/expo-communication';
import { gun } from '@/lib/gun';
import { setGTADefaultOptions } from '@/lib/gun/options';
import { getGunRef, mergeKeys } from '@/lib/gun/utils';
import { bootstrapRuntimeHealth } from '@/lib/runtime-health';
import { bootstrapLiveRuntimeRecovery } from '@/lib/runtime-recovery';
import { appSchema, transformSchema } from '@/lib/schema';
import { defaultPresets } from '@/lib/theme';
import { buildCriticalThemeCss } from '@/lib/theme/critical-theme-css';
import { datamatrixDeviceCallback } from '@/server-functions/datamatrix-device-callback';
import { migrateMarketplaceSeedReleases } from '@/server-functions/plugins';
import { getUser, removeUser } from '@/server-functions/user';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import appCss from '../styles.css?url';

setGTADefaultOptions({ schema: transformSchema(appSchema), gun });

const MARKETPLACE_SEED_MIGRATION_STORAGE_KEY =
  'supersurkhet.marketplace-seed-migration.v1';
let marketplaceSeedMigrationPromise: Promise<void> | null = null;

function hasMarketplaceSeedMigrationMarker() {
  try {
    return (
      window.localStorage.getItem(MARKETPLACE_SEED_MIGRATION_STORAGE_KEY) !==
      null
    );
  } catch {
    return false;
  }
}

function setMarketplaceSeedMigrationMarker() {
  try {
    window.localStorage.setItem(
      MARKETPLACE_SEED_MIGRATION_STORAGE_KEY,
      new Date().toISOString(),
    );
  } catch {
    // Ignore storage write failures and rely on idempotent migration.
  }
}

function runMarketplaceSeedMigrationOnce(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (hasMarketplaceSeedMigrationMarker()) {
    return Promise.resolve();
  }

  if (!marketplaceSeedMigrationPromise) {
    marketplaceSeedMigrationPromise = migrateMarketplaceSeedReleases({
      data: { actorUserId: 'system-migration' },
    })
      .then(() => {
        setMarketplaceSeedMigrationMarker();
      })
      .catch((error) => {
        console.error('Marketplace seed migration failed:', error);
      })
      .finally(() => {
        marketplaceSeedMigrationPromise = null;
      });
  }

  return marketplaceSeedMigrationPromise;
}

export interface UserProfile {
  avatar: string;
  email: string;
  isActive: boolean;
  phone?: string;
  role?: string;
}

async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  return await new Promise<UserProfile>((resolve) => {
    getGunRef(mergeKeys('user')).get(user.pub).once(resolve);
  });
}

async function getCurrentUser() {
  // const user = await recallUser();
  const userLocal = await getUser();
  gun.user().auth(userLocal);
  const user = gun.user().recall({ sessionStorage: false }) as
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    IGunUserInstance<any, any, any, any> | undefined;
  if (!user?.is) return null;
  return {
    pub: user.is.pub,
    email: user.is.alias,
    // @ts-expect-error
    role: user._?.role || 'user',
    // @ts-expect-error
    businessId: user._?.businessId,
    // @ts-expect-error
    permissions: user._?.permissions,
    // @ts-expect-error
    isActive: user._?.isActive ?? true,
    // @ts-expect-error
    avatar: user._?.avatar,
    // @ts-expect-error
    phone: user._?.phone,
    ...user,
  };
}

async function recallUser() {
  const user = await getUser();
  gun.user().auth(user);
  return gun.user().recall({ sessionStorage: false });
}

function logout() {
  gun.user().leave();
  removeUser();
  window.location.reload();
}

async function isAuthenticated() {
  await recallUser();
  return !!gun.user().is;
}

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title:
          'SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive',
      },
      {
        name: 'description',
        content:
          'SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.',
      },
      {
        name: 'keywords',
        content:
          'Surkhet, digital platform, local businesses, community services, Nepal, marketplace, directory, events',
      },
      {
        name: 'author',
        content: 'SuperSurkhet Team',
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      {
        name: 'twitter:url',
        content: 'https://surkhet.app',
      },
      {
        property: 'og:url',
        content: 'https://surkhet.app',
      },
      {
        property: 'og:title',
        content:
          'SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive',
      },
      {
        property: 'og:description',
        content:
          'SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:locale',
        content: 'en_US',
      },
      {
        property: 'og:site_name',
        content: 'SuperSurkhet',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content:
          'SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive',
      },
      {
        name: 'twitter:description',
        content:
          'SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.',
      },
      {
        property: 'og:image',
        content: '/og-image.png',
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        name: 'twitter:image',
        content: '/og-image.png',
      },
      {
        name: 'theme-color',
        content: '#000000',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // {
      //   rel: "stylesheet",
      //   children: ctx.loaderData.criticalThemeCSS,
      // },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  validateSearch: z
    .object({
      p: z.string().optional().catch(undefined),
    })
    .optional(),
  loader: async () => {
    const savedThemeName = await getAppTheme();
    const savedDarkMode = await getAppDarkMode();
    const _savedTheme = await getAppThemeData();
    const savedPresetTheme =
      savedThemeName && savedThemeName in defaultPresets
        ? defaultPresets[savedThemeName as keyof typeof defaultPresets].styles
        : null;
    const savedTheme =
      _savedTheme ?? savedPresetTheme ?? defaultPresets.tangerine.styles;
    const isDarkMode = resolveDarkModePreference(savedDarkMode);

    // Generate critical CSS for the current theme to prevent FOUC
    const criticalThemeCSS = buildCriticalThemeCss(savedTheme, isDarkMode);

    return {
      savedThemeName,
      savedDarkMode,
      savedTheme,
      criticalThemeCSS,
    };
  },
  context: () => ({
    auth: {
      getCurrentUser,
      logout,
      isAuthenticated,
      getUserProfile,
    },
    gun,
  }),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
  pendingComponent: () => <UserLoading />,
  shellComponent: () => {
    return (
      <RootDocument>
        <Toaster richColors />
        <Outlet />
        <VibeKanbanWebCompanion />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
            openHotkey: ['Shift', 'd'],
            triggerHidden: true,
            hideUntilHover: true,
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
      </RootDocument>
    );
  },
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const runtimeHealth = bootstrapRuntimeHealth({
      target: window,
      getVisibilityState: () => document.visibilityState,
      onError: (error) => {
        console.error('Runtime health capture failed:', error);
      },
    });
    const runtimeRecovery = bootstrapLiveRuntimeRecovery({
      runtimeHealthService: runtimeHealth.service,
      target: window,
      threshold: 3,
      thresholdWindowMs: 60_000,
      onError: (error) => {
        console.error('Runtime recovery evaluation failed:', error);
      },
    });

    void runMarketplaceSeedMigrationOnce();
    recallUser();

    // Set up message listener for communication with Expo app
    const handleMessage = (event: MessageEvent) => {
      const message = parseExpoBridgeMessageAndUnwrap(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'DEVICE_READY') {
        console.log('Expo app is ready and connected');
        return;
      }

      if (isDataMatrixDeviceCallbackMessage(message)) {
        void datamatrixDeviceCallback({ data: message }).catch((error) => {
          console.error(
            'Failed to ingest DataMatrix device callback from bridge:',
            error,
          );
        });
        return;
      }

      if (message.type === 'WEB_TO_NATIVE') {
        console.log('Received response from Expo app:', message.payload);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      runtimeRecovery.dispose();
      runtimeHealth.dispose();
    };
  }, []);

  // const handleActionDetected = (action: DataMatrixAction) => {
  //   console.log("Action detected:", action);
  //
  //   // Import utility functions for Expo communication
  //   const isExpoContext = () => typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
  //   const sendMessageToExpo = (message: any) => {
  //     try {
  //       if (isExpoContext()) {
  //         (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
  //       }
  //     } catch (error) {
  //       console.error('Failed to send message to Expo app:', error);
  //     }
  //   };
  //
  //   switch (action.action) {
  //     case 'wifi_connect':
  //       if (action.wifi) {
  //         // Check if we're in Expo app context
  //         if (isExpoContext()) {
  //           // Send WiFi connection request to Expo app
  //           sendMessageToExpo({
  //             type: 'DATAMATRIX_ACTION',
  //             payload: action
  //           });
  //         } else {
  //           // In a web context, we can't directly connect to WiFi
  //           // Instead, we'll show instructions to the user
  //           toast.info(`WiFi Network: ${action.wifi.ssid}`, {
  //             description: "Please connect to this WiFi network manually in your device settings.",
  //             duration: 10000,
  //           });
  //
  //           // If there's a post-connect notification, show it
  //           if (action.post_connect) {
  //             setTimeout(() => {
  //               toast.success(
  //                 action.post_connect?.notification.title,
  //                 { description: action.post_connect?.notification.message }
  //               );
  //             }, 3000);
  //           }
  //
  //           // If there's navigation after connection, show it
  //           if (action.navigation) {
  //             setTimeout(() => {
  //               toast.info("Next Step", {
  //                 description: `After connecting to WiFi, navigate to: ${action.navigation?.url}`,
  //               });
  //             }, 6000);
  //           }
  //         }
  //       }
  //       break;
  //
  //     case 'navigate':
  //       if (action.navigation) {
  //         // Check if we're in Expo app context
  //         if (isExpoContext()) {
  //           // Send navigation request to Expo app
  //           sendMessageToExpo({
  //             type: 'NAVIGATE',
  //             payload: action.navigation
  //           });
  //         } else {
  //           // Navigate to the specified URL in web context
  //           window.location.href = action.navigation.url;
  //         }
  //       }
  //       break;
  //
  //     case 'notification':
  //       // Check if we're in Expo app context
  //       if (isExpoContext()) {
  //         // Send notification request to Expo app
  //         sendMessageToExpo({
  //           type: 'NOTIFICATION',
  //           payload: {
  //             title: "Notification",
  //             message: "You've received a notification from the QR code."
  //           }
  //         });
  //       } else {
  //         // Show a notification in web context
  //         toast.info("Notification", {
  //           description: "You've received a notification from the QR code.",
  //         });
  //       }
  //       break;
  //
  //     default:
  //       // For all other actions, send to Expo app if available
  //       if (isExpoContext()) {
  //         sendMessageToExpo({
  //           type: 'DATAMATRIX_ACTION',
  //           payload: action
  //         });
  //       } else {
  //         toast.success(`Action detected: ${action.action}`);
  //       }
  //   }
  // };

  const loaderData = Route.useLoaderData();
  const isDarkMode = resolveDarkModePreference(loaderData.savedDarkMode);

  return (
    <html lang="en" className={isDarkMode ? 'dark' : ''}>
      <head>
        <HeadContent />
        <style>{loaderData.criticalThemeCSS}</style>
      </head>
      <body>
        <div data-vaul-drawer-wrapper="" className="min-h-screen w-full">
          <NuqsAdapter>
            <I18nProvider>
              <ThemeModeProvider
                savedDarkMode={loaderData.savedDarkMode}
                savedTheme={loaderData.savedTheme}
                savedThemeName={loaderData.savedThemeName}
              >
                <GoogleLoginProvider>
                  <AuthProvider>
                    <TooltipProvider>
                      <DialogProvider>
                        <DrawerProvider>
                          <OneTapLoginProvider>
                            <ConfettiProvider>
                              <LoginPromptProvider>
                                {children}
                                {
                                  // isMobile && <QRScannerButton onActionDetected={handleActionDetected} />
                                }
                              </LoginPromptProvider>
                            </ConfettiProvider>
                          </OneTapLoginProvider>
                        </DrawerProvider>
                      </DialogProvider>
                    </TooltipProvider>
                  </AuthProvider>
                </GoogleLoginProvider>
              </ThemeModeProvider>
            </I18nProvider>
          </NuqsAdapter>
          <Scripts />
          <AgentationBridge />
        </div>
      </body>
    </html>
  );
}

function AgentationBridge() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const isAgentationTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest('[data-feedback-toolbar], [data-agentation-root]') !==
        null;

    const handleFocusIn = (event: FocusEvent) => {
      if (!isAgentationTarget(event.target)) return;
      event.stopImmediatePropagation();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (
        !isAgentationTarget(event.target) &&
        !isAgentationTarget(event.relatedTarget)
      ) {
        return;
      }
      event.stopImmediatePropagation();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <DismissableLayerBranch
      data-agentation-root="true"
      onPointerDown={stopPropagation}
      onFocus={stopPropagation}
      onBlur={stopPropagation}
    >
      <Agentation />
    </DismissableLayerBranch>
  );
}
