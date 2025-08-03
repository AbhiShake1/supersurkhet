import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import { api } from "@/lib/api";
import type { Business } from "@/lib/schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Layout, Loader2, Menu, MenuSquare } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/$businessName/admin")({
  component: () => {
    const { businessName } = Route.useParams();
    const { data: allBusinesses = [] } = api.business.useGet();
    const { promptLogin } = useLoginPrompt()
    const { user } = useAuth()

    useEffect(() => {
      promptLogin()
    }, [user])

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
        return <RestaurantAdminPage slug={businessName} />
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

