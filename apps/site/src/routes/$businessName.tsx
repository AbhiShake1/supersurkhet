import { createFileRoute, Outlet } from '@tanstack/react-router';
import { BusinessPickerFallback } from '@/components/business-picker-fallback';

export const Route = createFileRoute('/$businessName')({
  component: RouteComponent,
  notFoundComponent: BusinessRouteNotFound,
});

function RouteComponent() {
  return <Outlet />;
}

function BusinessRouteNotFound() {
  const { businessName } = Route.useParams();
  return <BusinessPickerFallback requestedBusinessName={businessName} />;
}
