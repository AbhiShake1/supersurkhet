import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/blocks/chat-template";
import { SidebarProvider } from "@/components/blocks/sidebar";

export const Route = createFileRoute("/_business/chat")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider defaultOpen={false}>
			<Home />
		</SidebarProvider>
	);
}
