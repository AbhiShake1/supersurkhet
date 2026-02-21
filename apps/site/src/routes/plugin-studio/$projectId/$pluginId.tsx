import { createFileRoute } from '@tanstack/react-router';
import { PluginStudioPage } from '../index';

export const Route = createFileRoute('/plugin-studio/$projectId/$pluginId')({
  component: PluginStudioProjectPluginRoute,
});

function PluginStudioProjectPluginRoute() {
  const { projectId, pluginId } = Route.useParams();
  return (
    <PluginStudioPage
      initialProjectId={projectId}
      initialPluginId={pluginId}
      initialStudioView="workspace"
    />
  );
}
