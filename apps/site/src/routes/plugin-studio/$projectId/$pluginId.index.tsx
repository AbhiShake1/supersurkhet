import { createFileRoute } from '@tanstack/react-router';
import { PluginStudioEditor } from './-plugin-studio-editor';

export const Route = createFileRoute('/plugin-studio/$projectId/$pluginId/')({
  component: PluginStudioPluginRoute,
});

function PluginStudioPluginRoute() {
  const { projectId, pluginId } = Route.useParams();

  return <PluginStudioEditor projectId={projectId} pluginId={pluginId} />;
}
