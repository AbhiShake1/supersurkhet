import "@/lib/monkey-patches";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import TanstackQueryLayout from "../integrations/tanstack-query/layout";

import appCss from "../styles.css?url";

import { NotFound } from "@/components/ui/not-found";
import { ErrorComponent } from "@/components/ui/error";
import { Toaster } from "@/components/ui/sonner";
import { gun } from "@/lib/gun";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { ConfettiProvider } from "@/components/confetti-provider";
import { LoginPromptProvider } from "@/components/login-prompt-provider";
import {
  GoogleLoginProvider,
  OneTapLoginProvider,
} from "@/integrations/tanstack-query/google-login-provider";
import { setGTADefaultOptions } from "@/lib/gun/options";
import { appSchema, transformSchema } from "@/lib/schema";
import { QRScannerButton } from "@/components/ui/qr-scanner-button";
import { toast } from "sonner";
import type { DataMatrixAction } from "@/lib/datamatrix";
import { getAppTheme, getAppDarkMode, getAppThemeData } from "@/contexts/theme-context";
import { ThemeProvider as ThemeModeProvider } from "@/contexts/theme-context";
import { defaultPresets } from "@/lib/theme";
import { getUser, removeUser } from "@/server-functions/user";
import type { IGunUserInstance } from "gun/types";
import z from "zod";
import { getGunRef, mergeKeys } from "@/lib/gun/utils";
import { I18nProvider } from "@/contexts/i18n-context";
import { DialogProvider } from "@/contexts/dialog-context";

setGTADefaultOptions({ schema: transformSchema(appSchema), gun });

interface MyRouterContext {
  queryClient: QueryClient;
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
    getGunRef(mergeKeys("user")).get(user.pub).once(resolve);
  });
}

async function getCurrentUser() {
  // const user = await recallUser();
  const userLocal = await getUser()
  gun.user().auth(userLocal);
  const user = gun.user().recall({ sessionStorage: false }) as IGunUserInstance<any, any, any, any> | undefined;
  if (!user?.is) return null;
  return {
    pub: user.is.pub,
    email: user.is.alias,
    // @ts-expect-error
    role: user._?.role || "user",
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
  removeUser()
  window.location.reload();
}

async function isAuthenticated() {
  await recallUser()
  return !!gun.user().is;
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title:
          "SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive",
      },
      {
        name: "description",
        content:
          "SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.",
      },
      {
        name: "keywords",
        content:
          "Surkhet, digital platform, local businesses, community services, Nepal, marketplace, directory, events",
      },
      {
        name: "author",
        content: "SuperSurkhet Team",
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        property: "og:title",
        content:
          "SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive",
      },
      {
        property: "og:description",
        content:
          "SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:locale",
        content: "en_US",
      },
      {
        property: "og:site_name",
        content: "SuperSurkhet",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content:
          "SuperSurkhet - Digital Hub of Surkhet | Connect, Discover, Thrive",
      },
      {
        name: "twitter:description",
        content:
          "SuperSurkhet is your comprehensive digital platform connecting people, businesses, and services in Surkhet Valley. Discover local businesses, connect with community, and access essential services all in one place.",
      },
      {
        property: "og:image",
        content: "/og-image.png",
      },
      {
        property: "og:image:width",
        content: "1200",
      },
      {
        property: "og:image:height",
        content: "630",
      },
      {
        name: "twitter:image",
        content: "/og-image.png",
      },
      {
        name: "theme-color",
        content: "#000000",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // {
      //   rel: "stylesheet",
      //   children: ctx.loaderData.criticalThemeCSS,
      // },
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  validateSearch: z.object({
    p: z.string().optional().catch(undefined),
  }).optional(),
  loader: async ({ context }) => {
    // const { api } = await import("@/lib/api");
    // setGTADefaultOptions({ schema: transformSchema(appSchema), gun });
    // const bGet = await api.business.get({ keys: ["anjal-store"], single: true })
    // console.log({ bGet })
    const savedThemeName = await getAppTheme();
    const savedDarkMode = await getAppDarkMode();
    const _savedTheme = await getAppThemeData();
    const savedTheme = _savedTheme ?? defaultPresets["tangerine"].styles

    // Generate critical CSS for the current theme to prevent FOUC
    let criticalThemeCSS = '';
    if (savedTheme) {
      const themeToUse = savedDarkMode === 'true' ? savedTheme.dark : savedTheme.light;
      const themeNotToUse = savedDarkMode === 'true' ? savedTheme.light : savedTheme.dark;
      if (themeToUse) {
        const variables = Object.entries({ ...themeNotToUse, ...themeToUse })
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `--${key}: ${value}`)
          .join('; ');

        criticalThemeCSS = savedDarkMode === 'true'
          ? `:root { ${variables}; } .dark { ${variables}; }`
          : `:root { ${variables}; }`;
      }

    }

    return {
      savedThemeName,
      savedDarkMode,
      savedTheme,
      criticalThemeCSS
    };
  },
  context: () => ({
    auth: {
      getCurrentUser,
      logout,
      isAuthenticated,
      getUserProfile,
    },
    gun
  }),

  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
  component: () => {
    const loaderData = Route.useLoaderData()
    // console.log({ loaderData })

    // import("@/lib/api").then(({ api }) => {
    //   setGTADefaultOptions({ schema: transformSchema(appSchema), gun });
    //   api.business.get().then(business => console.log({ business }))
    // })
    return <RootDocument>
      <style>
        {loaderData.criticalThemeCSS}
      </style>
      <Toaster richColors />
      <TooltipProvider>
        <NuqsAdapter>
          <Outlet />
        </NuqsAdapter>
      </TooltipProvider>
      <TanStackRouterDevtools position="bottom-right" />
      <TanstackQueryLayout />
    </RootDocument>
  },
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    recallUser();

    // Set up message listener for communication with Expo app
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Handle messages from the Expo app
        if (message.type === 'DEVICE_READY') {
          console.log('Expo app is ready and connected');
        } else if (message.type === 'WEB_TO_NATIVE') {
          // Handle responses from native app
          console.log('Received response from Expo app:', message.payload);
        }
      } catch (error) {
        console.error('Failed to parse message from Expo app:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleActionDetected = (action: DataMatrixAction) => {
    console.log("Action detected:", action);

    // Import utility functions for Expo communication
    const isExpoContext = () => typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
    const sendMessageToExpo = (message: any) => {
      try {
        if (isExpoContext()) {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      } catch (error) {
        console.error('Failed to send message to Expo app:', error);
      }
    };

    switch (action.action) {
      case 'wifi_connect':
        if (action.wifi) {
          // Check if we're in Expo app context
          if (isExpoContext()) {
            // Send WiFi connection request to Expo app
            sendMessageToExpo({
              type: 'DATAMATRIX_ACTION',
              payload: action
            });
          } else {
            // In a web context, we can't directly connect to WiFi
            // Instead, we'll show instructions to the user
            toast.info(`WiFi Network: ${action.wifi.ssid}`, {
              description: "Please connect to this WiFi network manually in your device settings.",
              duration: 10000,
            });

            // If there's a post-connect notification, show it
            if (action.post_connect) {
              setTimeout(() => {
                toast.success(
                  action.post_connect?.notification.title,
                  { description: action.post_connect?.notification.message }
                );
              }, 3000);
            }

            // If there's navigation after connection, show it
            if (action.navigation) {
              setTimeout(() => {
                toast.info("Next Step", {
                  description: `After connecting to WiFi, navigate to: ${action.navigation?.url}`,
                });
              }, 6000);
            }
          }
        }
        break;

      case 'navigate':
        if (action.navigation) {
          // Check if we're in Expo app context
          if (isExpoContext()) {
            // Send navigation request to Expo app
            sendMessageToExpo({
              type: 'NAVIGATE',
              payload: action.navigation
            });
          } else {
            // Navigate to the specified URL in web context
            window.location.href = action.navigation.url;
          }
        }
        break;

      case 'notification':
        // Check if we're in Expo app context
        if (isExpoContext()) {
          // Send notification request to Expo app
          sendMessageToExpo({
            type: 'NOTIFICATION',
            payload: {
              title: "Notification",
              message: "You've received a notification from the QR code."
            }
          });
        } else {
          // Show a notification in web context
          toast.info("Notification", {
            description: "You've received a notification from the QR code.",
          });
        }
        break;

      default:
        // For all other actions, send to Expo app if available
        if (isExpoContext()) {
          sendMessageToExpo({
            type: 'DATAMATRIX_ACTION',
            payload: action
          });
        } else {
          toast.success(`Action detected: ${action.action}`);
        }
    }
  };

  const loaderData = Route.useLoaderData()

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <div data-vaul-drawer-wrapper="">
          <I18nProvider>
            <ThemeModeProvider savedDarkMode={loaderData.savedDarkMode} savedTheme={loaderData.savedTheme} savedThemeName={loaderData.savedThemeName}>
              <DialogProvider>
                <GoogleLoginProvider>
                  <AuthProvider>
                    <OneTapLoginProvider>
                      <ConfettiProvider>
                        <LoginPromptProvider>
                          {children}
                          {
                            isMobile() && <QRScannerButton onActionDetected={handleActionDetected} />
                          }
                        </LoginPromptProvider>
                      </ConfettiProvider>
                    </OneTapLoginProvider>
                  </AuthProvider>
                </GoogleLoginProvider>
              </DialogProvider>
            </ThemeModeProvider>
          </I18nProvider>
          <Scripts />
        </div>
      </body>
    </html>
  );
}
