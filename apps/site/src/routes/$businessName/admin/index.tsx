import { useAuth } from "@/components/auth-provider";
import { AutoAdmin } from "@/components/auto-admin";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import { NotFound } from "@/components/ui/not-found";
import { useBusinessConfig } from "@/config/business-config";
import { BusinessProvider } from "@/contexts/business-context";
import { api } from "@/lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/$businessName/admin/")({
  component: () => {
    const { businessName } = Route.useParams();
    const { data: allBusinesses = [], isLoading } = api.business.useGet({ keys: [businessName], single: true });
    const { promptLogin, closeLoginPrompt } = useLoginPrompt();
    const { isAuthenticated, user } = useAuth();

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

    if (!user) return null;

    const business = allBusinesses?.[0];

    if (!business?.basePath) {
      return <NotFound />
    }

    function Child() {
      const config = useBusinessConfig({ slug: businessName })[business!.businessType!];
      if (!config?.length) return (
        <div className="p-2">
          <h3>{businessName} Admin Dashboard</h3>
          <p>This is the admin panel for {businessName}.</p>
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
            <code>{JSON.stringify(business, null, 2)}</code>
          </pre>
        </div>
      );
      return <AutoAdmin tabs={config ?? []} />
    }

    return <BusinessProvider business={business}>
      <Child />
    </BusinessProvider>
  },
});

