import { createFileRoute } from '@tanstack/react-router';
import { DataMatrixClientPage } from '@/components/pages/datamatrix/datamatrix-client-page';

export const Route = createFileRoute('/$businessName/admin/qr-agent')({
  component: QrAgentRouteComponent,
});

function QrAgentRouteComponent() {
  const { businessName } = Route.useParams();
  return <DataMatrixClientPage businessSlug={businessName} />;
}
