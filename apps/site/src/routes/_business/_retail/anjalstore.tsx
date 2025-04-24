import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_business/_retail/anjalstore")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_business/_retail/anjalstore"!</div>;
}
