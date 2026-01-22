import { CustomUiRendererPage } from "@/components/ui-builder";
import { NotFound } from "@/components/ui/not-found";
import { BusinessProvider } from "@/contexts/business-context";
import { api } from "@/lib/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Shield } from "lucide-react";
import { lazy } from "react";
import { BusinessAccessGate } from "@/components/permission-gate/business-access-gate";
import { Button } from "@/components/ui/button";

const GenericClientPage = lazy(
  () => import("@/components/pages/generic/generic-client-page"),
);

export const Route = createFileRoute("/$businessName/")({
  component: () => {
    const { businessName } = Route.useParams();

    const { data: allBusinesses = [], isLoading } = api.business.useGet({
      keys: [businessName],
      single: true,
    });

    if (isLoading || allBusinesses.length === 0) {
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
      return <NotFound />;
    }

    function getChild() {
      if (business.uiBuilder?.layers) {
        return <CustomUiRendererPage slug={businessName} />;
      }

      switch (business.businessType) {
        default:
          return (
            <GenericClientPage
              slug={businessName}
              businessType={business.businessType}
            />
          );
      }
    }

    return (
      <BusinessProvider business={business}>
        {getChild()}
        <BusinessAccessGate business={business}>
          <div className="fixed bottom-4 right-4 z-50">
            <Button asChild size="lg" className="rounded-full shadow-lg">
              <Link
                className="gap-2 flex"
                to="/$businessName/admin"
                params={{ businessName: business.basePath ?? "" }}
              >
                <Shield className="h-4 w-4" />
                Go to Admin
              </Link>
            </Button>
          </div>
        </BusinessAccessGate>
      </BusinessProvider>
    );
  },
});
