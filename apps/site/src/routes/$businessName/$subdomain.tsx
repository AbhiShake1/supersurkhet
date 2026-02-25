import { createFileRoute } from '@tanstack/react-router';
import { AutoAdminResolved } from '@/components/auto-admin/auto-admin-resolved';
import { CustomUiRendererPage } from '@/components/ui-builder';

export const Route = createFileRoute('/$businessName/$subdomain')({
  component: BusinessSubdomainRoute,
});

function BusinessSubdomainRoute() {
  const { businessName, subdomain } = Route.useParams();

  if (subdomain.toLowerCase() === 'admin') {
    return <AutoAdminResolved />;
  }

  return <CustomUiRendererPage slug={businessName} pageName={subdomain} />;
}
