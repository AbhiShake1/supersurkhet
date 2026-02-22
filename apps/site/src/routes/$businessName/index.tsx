import { CustomUiRendererPage } from '@/components/ui-builder';
import { NotFound } from '@/components/ui/not-found';
import { BusinessProvider } from '@/contexts/business-context';
import { api } from '@/lib/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2, MapPin, Shield } from 'lucide-react';
import { BusinessAccessGate } from '@/components/permission-gate/business-access-gate';
import { Button } from '@/components/ui/button';
import { BusinessLocationMap } from '@/components/business-location-map';

export const Route = createFileRoute('/$businessName/')({
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

      // Show location map if there are coordinates but no custom UI
      if (business.locationCoordinates) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-5xl px-6">
              <BusinessLocationMap
                business={business}
                className="w-full h-[700px]"
              />
            </div>
          </div>
        );
      }

      return <NotFound />;
    }

    return (
      <BusinessProvider business={business}>
        <div className="container mx-auto px-4 py-8">
          {/* Business Header with Location */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">{business.name}</h1>
                {business.locationCoordinates && (
                  <div className="flex items-center mt-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{business.locationCoordinates}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {getChild()}
        </div>

        <BusinessAccessGate business={business}>
          <div className="fixed bottom-4 right-4 z-50">
            <Button asChild size="lg" className="rounded-full shadow-lg">
              <Link
                className="gap-2 flex"
                to="/$businessName/admin"
                params={{ businessName: business.basePath ?? '' }}
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
