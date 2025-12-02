import { CustomUiRendererPage } from "@/components/ui-builder";
import { NotFound } from "@/components/ui/not-found";
import { api } from "@/lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { lazy } from "react";

const RestaurantClientPage = lazy(() => import("@/components/pages/restaurant/restaurant-client-page"));
const HotelClientPage = lazy(() => import("@/components/pages/hotel/hotel-client-page"));
const PetrolPumpClientPage = lazy(() => import("@/components/pages/petrol-pump/petrol-pump-client-page"));
const GymClientPage = lazy(() => import("@/components/pages/gym/gym-client-page"));
const CinemaClientPage = lazy(() => import("@/components/pages/cinema/cinema-client-page"));
const FinancialFirmClientPage = lazy(() => import("@/components/pages/financial-firm/financial-firm-client-page"));
const RideSharingClientPage = lazy(() => import("@/components/pages/ride-sharing/ride-sharing-client-page"));
const ServiceClientPage = lazy(() => import("@/components/pages/service/service-client-page"));
const EducationClientPage = lazy(() => import("@/components/pages/education/education-client-page"));
const HealthcareClientPage = lazy(() => import("@/components/pages/healthcare/healthcare-client-page"));
const RealEstateClientPage = lazy(() => import("@/components/pages/real-estate/real-estate-client-page"));
const CooperativeClientPage = lazy(() => import("@/components/pages/cooperative/cooperative-client-page"));
// Import specific client pages as they become available
// const RetailClientPage = lazy(() => import("@/components/pages/retail/retail-client-page"));
// const LogisticsClientPage = lazy(() => import("@/components/pages/logistics/logistics-client-page"));
const GenericClientPage = lazy(() => import("@/components/pages/generic/generic-client-page"));


export const Route = createFileRoute("/$businessName/")({
  component: () => {
    const { businessName } = Route.useParams();

    const { data: allBusinesses = [], isLoading } = api.business.useGet({
      keys: [businessName],
      single: true,
    });

    if (isLoading) {
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

    const business = allBusinesses?.[0];

    if (!business) {
      // TODO: replace with business picker
      return <NotFound />
    }

    if (business.uiBuilder?.layers) {
      return <CustomUiRendererPage slug={businessName} />;
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
