import { useGet } from "@/lib/gun/index";
import type { Business } from "@/lib/schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/$businessName/admin")({
  component: () => {
    const { businessName } = Route.useParams();
    const allBusinesses = useGet("business");

    if (!allBusinesses.length) {
      return (
        <div className="items-center justify-center w-screen h-screen flex">
          <Loader2 className="animate-spin size-8" aria-label="Loading..." size="xl" />
        </div>
      );
    }

    const business = allBusinesses.find(
      (b: Business) => b.basePath === businessName
    );

    if (!business) {
      throw notFound()
    }
    return (
      <div className="p-2">
        <h3>{businessName} Admin Dashboard</h3>
        <p>This is the admin panel for {businessName}.</p>
        <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
          <code>{JSON.stringify(business, null, 2)}</code>
        </pre>
      </div>
    );
  },
});
