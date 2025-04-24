import { MapView } from "@/components/map";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_business/ride/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <MapView />;
}
