import { createFileRoute } from "@tanstack/react-router";
import { AppDrawer } from "@/components/app-drawer";

export const Route = createFileRoute("/apps/")({
	component: AppDrawerPage,
});

function AppDrawerPage() {
	return (
		<div className="container mx-auto py-6 px-4">
			<AppDrawer />
		</div>
	);
}
