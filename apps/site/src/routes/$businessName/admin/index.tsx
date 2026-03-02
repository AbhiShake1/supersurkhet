import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { NotFound } from '@/components/ui/not-found';
import { Unauthorized } from '@/components/ui/unauthorized';
import { useBusinessConfig } from '@/config/business-config';
import { BusinessProvider } from '@/contexts/business-context';
import { api } from '@/lib/api';
import { canAccessBusiness } from '@/lib/permissions/business-permissions';
import type { BusinessType } from '@/lib/schema';
import { getSoulFromUnknown } from '@/lib/utils';

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
    const userSoul = getSoulFromUnknown(user);

    if (!business?.basePath) {
      return <NotFound />;
    }

    if (!canAccessBusiness({ business, user, userSoul })) {
      return (
        <Unauthorized description="You are not a member of this organization." />
      );
    }

    return (
      <BusinessProvider business={business}>
        <Child
          businessName={businessName}
          businessType={business.businessType}
        />
      </BusinessProvider>
    );
  },
});

function Child({
  businessName,
  businessType,
}: {
  businessName: string;
  businessType: BusinessType;
}) {
  const config = useBusinessConfig({ slug: businessName })[businessType];
  if (!config?.length)
    return (
      <div className="p-2">
        <h3>{businessName} Admin Dashboard</h3>
        <p>This is the admin panel for {businessName}.</p>
      </div>
    );
  return <AutoAdmin tabs={config} />;
}
