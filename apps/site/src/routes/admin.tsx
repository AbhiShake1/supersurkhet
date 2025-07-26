import { AutoAdmin } from "@/components/auto-admin";
import { appSchema } from "@/lib/schema";
import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AutoAdmin
      // @ts-expect-error
      tabs={Object.keys(appSchema.shape).map((s) => ({
        schema: s,
        title: s[0].toUpperCase() + s.slice(1),
        icon: LucideBriefcaseBusiness,
      }))}
    />
  );
}
