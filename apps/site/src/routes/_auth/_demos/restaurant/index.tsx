import { RestaurantClientPage } from "@/components/pages/restaurant/restaurant-client-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_demos/restaurant/")({
	component: () => (
		<RestaurantClientPage slug="restaurant" />
	),
});
