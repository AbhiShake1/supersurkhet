import { useAuth } from '@/components/auth-provider';
import { AutoAdmin } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { NotFound } from '@/components/ui/not-found';
import { useBusinessConfig } from '@/config/business-config';
import { BusinessProvider } from '@/contexts/business-context';
import { api } from '@/lib/api';
import type { BusinessType } from '@/lib/schema';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/$businessName/admin/')({
  component: () => {
    const { businessName } = Route.useParams();
    const { data: allBusinesses = [], isLoading } = api.business.useGet({
      keys: [businessName],
      single: true,
    });
    const { promptLogin, closeLoginPrompt } = useLoginPrompt();
    const { isAuthenticated, user, isLoading: isUserLoading } = useAuth();

    useEffect(() => {
      if (!isAuthenticated && !isUserLoading)
        promptLogin({ dismissible: false, showBackgroundContent: false });
      else closeLoginPrompt();
    }, [isAuthenticated, closeLoginPrompt, isUserLoading, promptLogin]);

    if (isLoading || isUserLoading) {
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
      return <NotFound />;
    }

    return (
      <BusinessProvider business={business}>
        <Child
          businessName={businessName}
          businessId={business.id}
          businessType={business.businessType}
        />
      </BusinessProvider>
    );
  },
});

function Child({
  businessName,
  businessId,
  businessType,
}: {
  businessName: string;
  businessId: string;
  businessType: BusinessType;
}) {
  const config = useBusinessConfig({
    slug: businessName,
    businessId,
    businessType,
  })[businessType];
  if (!config?.length)
    return (
      <div className="p-2">
        <div className="flex items-center justify-between mb-4">
          <h3>{businessName} Admin Dashboard</h3>
          <Button asChild variant="outline" size="sm">
            <Link
              to="/$businessName/admin/plugins"
              params={{ businessName }}
            >
              Plugins
            </Link>
          </Button>
        </div>
        <p>This is the admin panel for {businessName}.</p>
      </div>
    );
  return (
    <AutoAdmin tabs={config} />
  );
}
