import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { Unauthorized } from "@/components/ui/unauthorized";
import { api } from "@/lib/api";
import { appSchema } from "@/lib/schema";
import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const { isAuthenticated, user } = useAuth();
  const { isLoading } = api.business.useGet();

  useEffect(() => {
    if (!isAuthenticated && !isLoading)
      promptLogin({ dismissible: false, showBackgroundContent: false });
    else closeLoginPrompt();
  }, [isAuthenticated, isLoading]);

  if (!isLoading && isAuthenticated && user && user?.role !== "admin") {
    return <Unauthorized />
  }

  if (!user) return null;

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
            group: schemaConfig.group, // Use group from schema definition
            slug: "",
            transformer: (d) => {
              if (d.length === 0) return []
              const firstData = d[0]
              if ("timestamp" in firstData) return d
              const result = d.flatMap(d => {
                const business = d._?.soul;
                return Object.values(d).map(d => !d || typeof d !== "object" ? null : ({ ...d, business }));
              }).filter(d => !!d && typeof d === "object" && !("soul" in d))
              if (!result.length) return d
              return result
            },
            extender: d => d.extend({ business: z.string().optional() }),
          };
        })}
    />
  );
}
