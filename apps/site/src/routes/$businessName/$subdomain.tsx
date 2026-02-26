import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CustomUiRendererPage } from '@/components/ui-builder';
import { useBusinessSubdomainLayersState } from '@/config/business-config';
import { api } from '@/lib/api';
import { hasBusinessAccess } from '@/lib/business-access';

export const Route = createFileRoute('/$businessName/$subdomain')({
  component: BusinessSubdomainRoute,
});

function BusinessSubdomainRoute() {
  const { businessName, subdomain } = Route.useParams();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const { layers, guardRule, isLoading } = useBusinessSubdomainLayersState({
    slug: businessName,
    subdomain,
  });
  const businessQuery = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businessQuery.data?.[0];
  const requiresAuthentication =
    guardRule === 'authenticated-user' || guardRule === 'organization-member';
  const requiresBusinessMembership = guardRule === 'organization-member';
  const hasGuardAccess =
    !guardRule ||
    (guardRule === 'authenticated-user' && isAuthenticated) ||
    (guardRule === 'organization-member' &&
      isAuthenticated &&
      hasBusinessAccess(business, user));

  useEffect(() => {
    if (!requiresAuthentication) {
      closeLoginPrompt();
      return;
    }
    if (!isAuthLoading && !isAuthenticated) {
      void promptLogin({
        dismissible: false,
        showBackgroundContent: false,
      });
      return;
    }
    closeLoginPrompt();
  }, [
    closeLoginPrompt,
    isAuthLoading,
    isAuthenticated,
    promptLogin,
    requiresAuthentication,
  ]);

  if (
    isLoading ||
    isAuthLoading ||
    (requiresBusinessMembership && !businessQuery.isFetched)
  ) {
    return <Spinner />;
  }

  if (requiresAuthentication && !isAuthenticated) {
    return <Spinner />;
  }

  if (!hasGuardAccess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This subdomain is restricted to business members.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CustomUiRendererPage
      slug={businessName}
      pageName={subdomain}
      layersOverride={layers ?? undefined}
    />
  );
}
