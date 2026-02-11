import { createFileRoute } from "@tanstack/react-router";
import { LucideBriefcaseBusiness } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { Unauthorized } from "@/components/ui/unauthorized";
import { api } from "@/lib/api";
import { appSchema } from "@/lib/schema";

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
  }, [isAuthenticated, isLoading, promptLogin, closeLoginPrompt]);

  if (!isLoading && isAuthenticated && user && user?.role !== "admin") {
    return <Unauthorized />;
  }

  if (!user) return null;

  const rawShape = appSchema.rawShape
  const entries = Object.entries(rawShape) as Array<
    [key: keyof typeof appSchema, value: typeof appSchema.rawShape[keyof typeof appSchema.rawShape]]
  >;

  const tabs = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schemaKey, schemaConfig]) => {
      type Row = z.infer<typeof schemaConfig.schema> & {
        _?: { soul?: string };
      };

      const transformer = (rows: Row[]): Row[] => {
        if (rows.length === 0) return rows;
        const first = rows[0];
        if ("timestamp" in first) return rows;

        const flattened = rows
          .flatMap((row) => {
            const business = row._?.soul;
            return Object.values(row).map((value) =>
              !value || typeof value !== "object"
                ? null
                : ({ ...value, business } as Row),
            );
          })
          .filter(
            (value): value is Row =>
              !!value && typeof value === "object" && !("soul" in value),
          );

        return flattened.length ? flattened : rows;
      };

      return {
        schema: schemaKey,
        title: schemaKey[0].toUpperCase() + schemaKey.slice(1),
        icon: schemaConfig.icon || LucideBriefcaseBusiness,
        group: schemaConfig.group,
        slug: "",
        transformer,
        extender: (d: typeof schemaConfig.schema) =>
          d.extend({ business: z.string().optional() }),
      };
    });

  return <AutoAdmin tabs={tabs} />;
}
