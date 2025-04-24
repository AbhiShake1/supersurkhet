import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_business/ride/admin/vehicle-types")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_business/ride/admin/vehicle-types"!</div>;
}
