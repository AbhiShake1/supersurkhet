import { createFileRoute } from '@tanstack/react-router';
import { PluginStudioEditor } from './-plugin-studio-editor';

export const Route = createFileRoute(
  '/plugin-studio/$projectId/$pluginId/subdomain/$subdomain',
)({
  component: PluginStudioSubdomainRoute,
});

function PluginStudioSubdomainRoute() {
  const { projectId, pluginId, subdomain } = Route.useParams();

  return (
    <PluginStudioEditor
      projectId={projectId}
      pluginId={pluginId}
      initialSubdomain={subdomain}
    />
  );
}
