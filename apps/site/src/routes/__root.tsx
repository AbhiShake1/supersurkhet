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
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { setGTADefaultOptions } from "@/lib/gun/options";
import { appSchema } from "@/lib/schema";
import { gun } from "@/lib/gun";

setGTADefaultOptions({ schema: appSchema, gun });

interface MyRouterContext {
	queryClient: QueryClient;
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
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
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
		],
	}),
	notFoundComponent: () => <NotFound />,
	component: () => (
		<RootDocument>
			<Toaster richColors />
			<TooltipProvider>
				<NuqsAdapter>
					<Outlet />
				</NuqsAdapter>
			</TooltipProvider>
			<TanStackRouterDevtools />
			<TanstackQueryLayout />
		</RootDocument>
	),
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark" vaul-drawer-wrapper="">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
