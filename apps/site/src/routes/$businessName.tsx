import { createFileRoute, notFound } from "@tanstack/react-router";
import { useGet } from "@/lib/gun/hooks";
import type { Business } from "@/lib/schema";
import { Loader2 } from "lucide-react";
import { RestaurantClientPage } from "@/components/pages/restaurant/restaurant-client-page";

export const Route = createFileRoute("/$businessName")({
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

    switch (business.businessType) {
      case "food":
        return <RestaurantClientPage slug={businessName} />
      default:
        return (
          <div className="p-4">
            <h3 className="text-2xl font-bold mb-4">Welcome to {business.name}</h3>
            <p className="text-lg mb-2">Business Type: <span className="capitalize">{business.businessType.replace(/_/g, " ")}</span></p>
            {business.location && <p className="text-lg mb-4">Location: {business.location}</p>}
            <h4 className="text-xl font-semibold mb-2">Raw Business Data:</h4>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              <code>{JSON.stringify(business, null, 2)}</code>
            </pre>
          </div>
        );
    }
  },
});
