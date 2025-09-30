import { AutoAdmin } from "@/components/auto-admin";
import { appSchema } from "@/lib/schema";
import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AutoAdmin
			// @ts-expect-error
			tabs={Object.keys(appSchema.rawShape)
				.sort((a, b) => a.localeCompare(b))
				.map((s) => ({
					schema: s,
					title: s[0].toUpperCase() + s.slice(1),
					icon: LucideBriefcaseBusiness,
					slug: "",
					transformer: (d) => d.flatMap(d => {
						const business = d._?.soul;
						return Object.values(d).map(d => !d || typeof d !== "object" ? null : ({ ...d, business }));
					}).filter(d => !!d && typeof d === "object" && !("soul" in d)),
					extender: d => d.extend({ business: z.string() }),
				}))}
		/>
	);
}
