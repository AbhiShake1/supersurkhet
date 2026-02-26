import { Outlet, createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

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
  component: PluginStudioLayoutRoute,
});

function PluginStudioLayoutRoute() {
  return <Outlet />;
}
