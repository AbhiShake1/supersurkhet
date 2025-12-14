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
  MapIcon,
  Menu,
  MenuSquare,
  ShoppingBag,
  Users,
  Wrench
} from "lucide-react";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import type { BusinessType } from "@/lib/schema";
import type { AutoTableTab } from "@/components/auto-admin";

export function getBusinessConfig({ slug }: { slug: string }): {
  [B in BusinessType]?: AutoTableTab<any>[];
} {
  return {
    food: [
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
    ],
    hotel: [
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
    ],

    petrol_pump: [
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
    ],

    gym: [
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
    ],

    cinema: [
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
    ],

    financial_firm: [
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
    ],

    ride_sharing: [
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
    ],

    service: [
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
    ],

    education: [
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
    ],

    healthcare: [
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
    ],

    real_estate: [
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
    ],

    cooperative: [
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
    ],

    retail: [
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
    ],
  }
}
