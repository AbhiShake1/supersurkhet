import { AutoAdmin } from "@/components/auto-admin";
import { appSchema } from "@/lib/schema";
import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness, Settings } from "lucide-react";
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
        .map((s) => {
          const schemaConfig = appSchema.rawShape[s as keyof typeof appSchema.rawShape];
          return {
            schema: s,
            title: s[0].toUpperCase() + s.slice(1),
            icon: schemaConfig.icon || LucideBriefcaseBusiness,
            slug: "",
            transformer: (d) => {
              if (d.length === 0) return []
              const firstData = d[0]
              if ("timestamp" in firstData) return d
              return d.flatMap(d => {
                const business = d._?.soul;
                return Object.values(d).map(d => !d || typeof d !== "object" ? null : ({ ...d, business }));
              }).filter(d => !!d && typeof d === "object" && !("soul" in d))
            },
            extender: d => d.extend({ business: z.string() }),
          };
        })}
    />
  );
}
