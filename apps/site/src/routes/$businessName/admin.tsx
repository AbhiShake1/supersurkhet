import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import { NotFound } from "@/components/ui/not-found";
import { api } from "@/lib/api";
import type { Business } from "@/lib/schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bed,
  Briefcase,
  Calendar,
  Car,
  Dumbbell,
  Film,
  Fuel,
  GraduationCap,
  Heart,
  Home,
  Layout,
  Loader2,
  MapIcon,
  Menu,
  MenuSquare,
  ShoppingBag,
  Users,
  Wrench
} from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/$businessName/admin")({
  component: () => {
    const { businessName } = Route.useParams();
    const { data: allBusinesses = [], isLoading } = api.business.useGet();
    const { promptLogin, closeLoginPrompt } = useLoginPrompt();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
      if (!isAuthenticated && !isLoading)
        promptLogin({ dismissible: false, showBackgroundContent: false });
      else closeLoginPrompt();
    }, [isAuthenticated, isLoading]);

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

    const business = allBusinesses.find(
      (b: Business) => b.basePath === businessName,
    );

    if (!business) {
      return <NotFound />
    }

    switch (business.businessType) {
      case "food":
        return <RestaurantAdminPage slug={businessName} />;
      case "hotel":
        return <HotelAdminPage slug={businessName} />;
      case "petrol_pump":
        return <PetrolPumpAdminPage slug={businessName} />;
      case "gym":
        return <GymAdminPage slug={businessName} />;
      case "cinema":
        return <CinemaAdminPage slug={businessName} />;
      case "financial_firm":
        return <FinancialFirmAdminPage slug={businessName} />;
      case "ride_sharing":
        return <RideSharingAdminPage slug={businessName} />;
      case "service":
        return <ServiceAdminPage slug={businessName} />;
      case "education":
        return <EducationAdminPage slug={businessName} />;
      case "healthcare":
        return <HealthcareAdminPage slug={businessName} />;
      case "real_estate":
        return <RealEstateAdminPage slug={businessName} />;
      case "cooperative":
        return <CooperativeAdminPage slug={businessName} />;
      case "retail":
        return <RetailAdminPage slug={businessName} />;
      default:
        return (
          <div className="p-2">
            <h3>{businessName} Admin Dashboard</h3>
            <p>This is the admin panel for {businessName}.</p>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              <code>{JSON.stringify(business, null, 2)}</code>
            </pre>
          </div>
        );
    }
  },
});

function RestaurantAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "menuItem",
          title: "Menus",
          slug: slug,
          icon: MenuSquare,
        },
        {
          title: "Orders",
          icon: Menu,
          schema: "order",
          slug: slug,
        },
        {
          title: "Layout",
          icon: Layout,
          children: <RestaurantLayoutEditor />,
        },
      ]}
    />
  );
}

function HotelAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "hotel",
          title: "Rooms",
          slug: slug,
          icon: Bed,
        },
        {
          schema: "order",
          title: "Bookings",
          slug: slug,
          icon: Menu,
        },
      ]}
    />
  );
}

function PetrolPumpAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "petrolPump",
          title: "Fuels & Services",
          slug: slug,
          icon: Fuel,
        },
        {
          schema: "order",
          title: "Transactions",
          slug: slug,
          icon: Menu,
        },
      ]}
    />
  );
}

function GymAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "gym",
          title: "Equipment & Memberships",
          slug: slug,
          icon: Dumbbell,
        },
        {
          schema: "order",
          title: "Bookings",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function CinemaAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "cinema",
          title: "Movies & Showtimes",
          slug: slug,
          icon: Film,
        },
        {
          schema: "order",
          title: "Ticket Sales",
          slug: slug,
          icon: Menu,
        },
      ]}
    />
  );
}

function FinancialFirmAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "financialFirm",
          title: "Services & Advisors",
          slug: slug,
          icon: Briefcase,
        },
        {
          schema: "appointment",
          title: "Appointments",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function RideSharingAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "rideSharing",
          title: "Vehicles & Drivers",
          slug: slug,
          icon: Car,
        },
        {
          schema: "trip",
          title: "Trips",
          slug: slug,
          icon: MapIcon,
        },
      ]}
    />
  );
}

function ServiceAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "service",
          title: "Services & Appointments",
          slug: slug,
          icon: Wrench,
        },
        {
          schema: "appointment",
          title: "Appointments",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function EducationAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "education",
          title: "Courses & Students",
          slug: slug,
          icon: GraduationCap,
        },
        {
          schema: "studentProfile",
          title: "Student Profiles",
          slug: slug,
          icon: Users,
        },
      ]}
    />
  );
}

function HealthcareAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "healthcare",
          title: "Patients & Doctors",
          slug: slug,
          icon: Heart,
        },
        {
          schema: "appointment",
          title: "Appointments",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function RealEstateAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "realEstate",
          title: "Properties & Listings",
          slug: slug,
          icon: Home,
        },
        {
          schema: "appointment",
          title: "Appointments",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function CooperativeAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "cooperative",
          title: "Members & Committees",
          slug: slug,
          icon: Users,
        },
        {
          schema: "appointment",
          title: "Meetings",
          slug: slug,
          icon: Calendar,
        },
      ]}
    />
  );
}

function RetailAdminPage({ slug }: { slug: string }) {
  return (
    <AutoAdmin
      tabs={[
        {
          schema: "product",
          title: "Products",
          slug: slug,
          icon: ShoppingBag,
        },
        {
          schema: "order",
          title: "Orders",
          slug: slug,
          icon: Menu,
        },
      ]}
    />
  );
}
