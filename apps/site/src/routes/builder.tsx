import { CustomUiBuilderPage } from '@/components/ui-builder';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/builder')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <CustomUiBuilderPage slug="builder1990" />
  );
}
