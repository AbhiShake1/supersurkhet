import { createFileRoute } from '@tanstack/react-router';
import { Spinner } from '@/components/ui/spinner';
import { CustomUiRendererPage } from '@/components/ui-builder';
import { useBusinessSubdomainLayersState } from '@/config/business-config';

export const Route = createFileRoute('/$businessName/$subdomain')({
  component: BusinessSubdomainRoute,
});

function BusinessSubdomainRoute() {
  const { businessName, subdomain } = Route.useParams();
  const { layers, isLoading } = useBusinessSubdomainLayersState({
    slug: businessName,
    subdomain,
  });
  if (isLoading) return <Spinner />;

  return (
    <CustomUiRendererPage
      slug={businessName}
      pageName={subdomain}
      layersOverride={layers ?? undefined}
    />
  );
}
