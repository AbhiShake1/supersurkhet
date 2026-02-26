import { createFileRoute } from '@tanstack/react-router';
import { PluginStudioSubdomainList } from './-plugin-studio-subdomain-list';

export const Route = createFileRoute('/plugin-studio/$projectId/$pluginId/')({
  component: PluginStudioPluginRoute,
});

function PluginStudioPluginRoute() {
  const { projectId, pluginId } = Route.useParams();

  return <PluginStudioSubdomainList projectId={projectId} pluginId={pluginId} />;
}
