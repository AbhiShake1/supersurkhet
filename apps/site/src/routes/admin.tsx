import { AutoTable } from "@/components/auto-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AutoTable
			slug="root1"
			schema="business"
		/>
	);
}
