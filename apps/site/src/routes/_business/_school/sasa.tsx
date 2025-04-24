import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_business/_school/sasa")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_business/_school/sasa"!</div>;
}
