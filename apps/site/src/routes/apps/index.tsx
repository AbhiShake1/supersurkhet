import { createFileRoute } from "@tanstack/react-router";
import { AppDrawer } from "@/components/app-drawer";
import { RecentlyUsedAppsProvider } from "@/components/app-drawer/recently-used-apps-context";
import { FoldersProvider } from "@/components/app-drawer/folders-context";

export const Route = createFileRoute("/apps/")({
	component: AppDrawerPage,
});

function AppDrawerPage() {
	return (
		<div className="container mx-auto py-6 px-4">
			<FoldersProvider>
				<RecentlyUsedAppsProvider>
					<AppDrawer />
				</RecentlyUsedAppsProvider>
			</FoldersProvider>
		</div>
	);
}
