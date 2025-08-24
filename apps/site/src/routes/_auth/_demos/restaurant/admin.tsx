import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import { createFileRoute } from "@tanstack/react-router";
import { Layout, Menu, MenuSquare } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth/_demos/restaurant/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	const { promptLogin, closeLoginPrompt } = useLoginPrompt();
	const { user } = useAuth();

	useEffect(() => {
		if (!user)
			promptLogin({ dismissible: false, showBackgroundContent: false });
		else closeLoginPrompt();
	}, [user]);

	return (
		<AutoAdmin
			tabs={[
				{
					schema: "menuItem",
					title: "Menus",
					slug: "restaurant",
					icon: MenuSquare,
				},
				{
					title: "Orders",
					icon: Menu,
					schema: "order",
					slug: "restaurant",
				},
				{
					title: "Layout",
					icon: Layout,
					children: <RestaurantLayoutEditor />,
				},
			]}
		/>
	);
}
