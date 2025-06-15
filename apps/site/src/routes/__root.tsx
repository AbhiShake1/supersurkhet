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
import { gun } from "@/lib/gun";
import { setGTADefaultOptions } from "@/lib/gun/options";
import { appSchema } from "@/lib/schema";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

setGTADefaultOptions({ schema: appSchema, gun });

interface MyRouterContext {
	queryClient: QueryClient;
}

export interface UserProfile {
	avatar: string
	email: string
	isActive: boolean
	phone?: string
	role?: string
}

async function getUserProfile() {
	const user = getCurrentUser()
	if (!user) return null
	return await new Promise<UserProfile>((resolve) => {
		gun.get("user").get(user.pub).once(resolve)
	})
}

function getCurrentUser() {
	const user = gun.user().recall({ sessionStorage: true });
	if (!user || !user.is) return null;
	// const dbUser = await new Promise((resolve, reject) => {
	// 	gun.get("user").put(user)
	// })
	// Fetch user profile from Gun
	// This is a sync placeholder; in real use, fetch async and cache
	return {
		pub: user.is.pub,
		email: user.is.alias,
		role: user._?.role || "user",
		businessId: user._?.businessId,
		permissions: user._?.permissions,
		isActive: user._?.isActive ?? true,
		avatar: user._?.avatar,
		phone: user._?.phone,
	};
}

function logout() {
	gun.user().leave();
	window.location.reload();
}

function isAuthenticated() {
	gun.user().recall({ sessionStorage: true });
	return !!gun.user().is;
}

const auth = {
	getCurrentUser,
	logout,
	isAuthenticated,
	getUserProfile,
};

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
	context: () => ({ auth, gun }),
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
	useEffect(() => {
		gun.user().recall({ sessionStorage: true })
	}, [])
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				<div data-vaul-drawer-wrapper="">
					{children}
					<Scripts />
				</div>
			</body>
		</html>
	);
}
