import { createFileRoute } from "@tanstack/react-router";
import { AppDrawer } from "@/components/app-drawer";
import { RecentlyUsedAppsProvider } from "@/components/app-drawer/recently-used-apps-context";

export const Route = createFileRoute("/apps/")({
	component: AppDrawerPage,
});

function AppDrawerPage() {
	return (
		<div className="container mx-auto py-6 px-4">
			<RecentlyUsedAppsProvider>
				<AppDrawer />
			</RecentlyUsedAppsProvider>
		</div>
	);
}
