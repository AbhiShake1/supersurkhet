import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/components/auth-provider';
import { useLoginPromptGuard } from '@/components/login-prompt-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CustomUiRendererPage } from '@/components/ui-builder';
import { useBusinessSubdomainLayersState } from '@/config/business-config';
import { api } from '@/lib/api';
import { hasBusinessAccess } from '@/lib/business-access';

export const Route = createFileRoute('/$businessName/{-$subdomain}')({
  component: BusinessSubdomainRoute,
});

function BusinessSubdomainRoute() {
  const { businessName, subdomain } = Route.useParams();
  const resolvedSubdomain = subdomain?.trim() ? subdomain : 'index';
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { layers, guardRule, isLoading } = useBusinessSubdomainLayersState({
    slug: businessName,
    subdomain: resolvedSubdomain,
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

  useLoginPromptGuard({
    enabled: requiresAuthentication,
    isAuthenticated,
    isLoading: isAuthLoading,
    dismissible: false,
    showBackgroundContent: false,
  });

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
      pageName={resolvedSubdomain}
      layersOverride={layers ?? undefined}
    />
  );
}
