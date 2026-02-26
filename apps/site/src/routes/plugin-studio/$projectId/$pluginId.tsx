import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PluginStudioEditor } from './-plugin-studio-editor';

const optionalSearchStringSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}, z.string().optional());

const pluginStudioSearchSchema = z.object({
  pluginId: optionalSearchStringSchema,
  draftId: optionalSearchStringSchema,
  sortBy: optionalSearchStringSchema,
  sortOrder: z.preprocess(
    (value) =>
      typeof value === 'string' ? value.trim().toLowerCase() : undefined,
    z.enum(['asc', 'desc']).optional(),
  ),
});

export const Route = createFileRoute('/plugin-studio/$projectId/$pluginId')({
  validateSearch: pluginStudioSearchSchema,
  component: PluginStudioRoute,
});

function PluginStudioRoute() {
  const { projectId, pluginId } = Route.useParams();

  return <PluginStudioEditor projectId={projectId} pluginId={pluginId} />;
}
