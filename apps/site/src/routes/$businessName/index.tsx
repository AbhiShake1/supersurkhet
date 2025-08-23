import { RestaurantClientPage } from "@/components/pages/restaurant/restaurant-client-page";
import { HotelClientPage } from "@/components/pages/hotel/hotel-client-page";
import { GenericClientPage } from "@/components/pages/generic/generic-client-page";
import { api } from "@/lib/api";
import type { Business } from "@/lib/schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/$businessName/")({
  component: () => {
    const { businessName } = Route.useParams();

    const { data: allBusinesses = [] } = api.business.useGet();

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
      case "hotel":
        return <HotelClientPage slug={businessName} />
      case "petrol_pump":
      case "gym":
      case "cinema":
      case "financial_firm":
      case "ride_sharing":
      case "retail":
      case "service":
      case "education":
      case "healthcare":
      case "logistics":
      case "real_estate":
      case "cooperative":
      case "other":
      default:
        return <GenericClientPage slug={businessName} businessType={business.businessType} />
    }
  },
});
