import { createFileRoute } from '@tanstack/react-router';
import { PluginStudioPage } from '../index';

export const Route = createFileRoute('/plugin-studio/$projectId/')({
  component: PluginStudioProjectRoute,
});

function PluginStudioProjectRoute() {
  const { projectId } = Route.useParams();
  return (
    <PluginStudioPage initialProjectId={projectId} initialStudioView="org" />
  );
}
