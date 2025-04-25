import { AutoAdmin } from "@/components/auto-admin";
import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness, School, Users2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	return <AutoAdmin tabs={[
		{
			schema: "business",
			title: "Businesses",
			icon: LucideBriefcaseBusiness,
		},
		{
			schema: "user",
			title: "Users",
			icon: Users2,
		},
		{
			schema: "school",
			title: "Schools",
			icon: School,
		},
	]} />
}
