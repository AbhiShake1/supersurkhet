import { RestaurantClientPage } from "@/components/pages/restaurant/restaurant-client-page";
import { HotelClientPage } from "@/components/pages/hotel/hotel-client-page";
import { PetrolPumpClientPage } from "@/components/pages/petrol-pump/petrol-pump-client-page";
import { GymClientPage } from "@/components/pages/gym/gym-client-page";
import { CinemaClientPage } from "@/components/pages/cinema/cinema-client-page";
import { FinancialFirmClientPage } from "@/components/pages/financial-firm/financial-firm-client-page";
import { RideSharingClientPage } from "@/components/pages/ride-sharing/ride-sharing-client-page";
import { ServiceClientPage } from "@/components/pages/service/service-client-page";
import { EducationClientPage } from "@/components/pages/education/education-client-page";
import { HealthcareClientPage } from "@/components/pages/healthcare/healthcare-client-page";
import { RealEstateClientPage } from "@/components/pages/real-estate/real-estate-client-page";
import { CooperativeClientPage } from "@/components/pages/cooperative/cooperative-client-page";
import { GenericClientPage } from "@/components/pages/generic/generic-client-page";
// Import specific client pages as they become available
// import { RetailClientPage } from "@/components/pages/retail/retail-client-page";
// import { LogisticsClientPage } from "@/components/pages/logistics/logistics-client-page";

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
          <Loader2
            className="animate-spin size-8"
            aria-label="Loading..."
            size="xl"
          />
        </div>
      );
    }

    const business = allBusinesses.find(
      (b: Business) => b.basePath === businessName,
    );

    if (!business) {
      throw notFound();
    }

    switch (business.businessType) {
      case "food":
        return <RestaurantClientPage slug={businessName} business={business} />;
      case "hotel":
        return <HotelClientPage slug={businessName} />;
      case "petrol_pump":
        return <PetrolPumpClientPage slug={businessName} />;
      case "gym":
        return <GymClientPage slug={businessName} />;
      case "cinema":
        return <CinemaClientPage slug={businessName} />;
      case "financial_firm":
        return <FinancialFirmClientPage slug={businessName} />;
      case "ride_sharing":
        return <RideSharingClientPage slug={businessName} />;
      case "education":
        return <EducationClientPage slug={businessName} />;
      case "healthcare":
        return <HealthcareClientPage slug={businessName} />;
      case "real_estate":
        return <RealEstateClientPage slug={businessName} />;
      case "cooperative":
        return <CooperativeClientPage slug={businessName} />;
      case "service":
        return <ServiceClientPage slug={businessName} />;
      // Add specific client pages as they become available
      // case "retail":
      //   return <RetailClientPage slug={businessName} />
      // case "logistics":
      //   return <LogisticsClientPage slug={businessName} />
      case "retail":
      case "logistics":
      case "other":
      default:
        return (
          <GenericClientPage
            slug={businessName}
            businessType={business.businessType}
          />
        );
    }
  },
});
