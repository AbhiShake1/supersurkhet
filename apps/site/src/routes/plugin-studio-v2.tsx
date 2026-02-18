import {
  createFileRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const workspaceShellTabIds = [
  'overview',
  'schemas',
  'workflows',
  'admin',
  'preview',
] as const;

const workspaceShellTabSchema = z.enum(workspaceShellTabIds);

export type WorkspaceShellTabId = z.infer<typeof workspaceShellTabSchema>;

export type LockedWorkspaceTab = {
  id: WorkspaceShellTabId;
  label: string;
  description: string;
};

export type WorkspaceDraftContext = {
  pluginId: string;
  draftId: string;
};

export const LOCKED_WORKSPACE_TABS: readonly LockedWorkspaceTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Workspace summary, metadata, and release readiness.',
  },
  {
    id: 'schemas',
    label: 'Schemas',
    description: 'Schema entities and field contracts.',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    description: 'Workflow graph and runtime actions.',
  },
  {
    id: 'admin',
    label: 'Admin Tabs',
    description: 'Admin surface organization and labels.',
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Runtime preview and draft validation output.',
  },
] as const;

export function readPluginIdFromPathState(
  pathname: string,
): string | undefined {
  const normalized = pathname.replace(/\/+$/, '');
  const marker = '/plugin-studio-v2/';
  const markerIndex = normalized.indexOf(marker);

  if (markerIndex < 0) return undefined;

  const pathRemainder = normalized.slice(markerIndex + marker.length);
  const pluginIdSegment = pathRemainder.split('/')[0];

  if (!pluginIdSegment) return undefined;

  const decodedPluginId = decodeURIComponent(pluginIdSegment).trim();
  return decodedPluginId.length > 0 ? decodedPluginId : undefined;
}

export function toWorkspaceShellTabHref(input: {
  tab: WorkspaceShellTabId;
  pluginId?: string;
  draftId?: string;
}) {
  const params = new URLSearchParams();
  params.set('tab', input.tab);
  if (input.draftId) {
    params.set('draftId', input.draftId);
  }
  if (input.pluginId) {
    params.set('pluginId', input.pluginId);
  }

  return `/plugin-studio-v2?${params.toString()}`;
}

export function resolveWorkspaceDraftContext(input: {
  pathname: string;
  pluginIdSearch?: string;
  draftIdSearch?: string;
}): WorkspaceDraftContext | undefined {
  const pluginId =
    readPluginIdFromPathState(input.pathname) ??
    input.pluginIdSearch?.trim() ??
    undefined;
  const draftId = input.draftIdSearch?.trim() ?? undefined;

  if (!pluginId || !draftId) return undefined;

  return {
    pluginId,
    draftId,
  };
}

const workspaceShellSearchSchema = z.object({
  tab: workspaceShellTabSchema.optional().catch(undefined),
  pluginId: z.string().optional().catch(undefined),
  draftId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/plugin-studio-v2')({
  validateSearch: workspaceShellSearchSchema,
  component: PluginStudioV2Route,
});

function PluginStudioV2Route() {
  const search = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate({ from: Route.fullPath });

  const activeTab = search.tab ?? LOCKED_WORKSPACE_TABS[0].id;
  const [mountedTabs, setMountedTabs] = useState<Set<WorkspaceShellTabId>>(
    () => new Set<WorkspaceShellTabId>([activeTab]),
  );

  useEffect(() => {
    setMountedTabs((currentMountedTabs) => {
      if (currentMountedTabs.has(activeTab)) return currentMountedTabs;
      const nextMountedTabs = new Set(currentMountedTabs);
      nextMountedTabs.add(activeTab);
      return nextMountedTabs;
    });
  }, [activeTab]);

  const context = useMemo(
    () =>
      resolveWorkspaceDraftContext({
        pathname: location.pathname,
        pluginIdSearch: search.pluginId,
        draftIdSearch: search.draftId,
      }),
    [location.pathname, search.draftId, search.pluginId],
  );

  if (!context) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        <header className="mb-4 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Plugin Studio V2
          </h1>
          <p className="text-sm text-muted-foreground">
            Workspace shell with locked tabs and draft bootstrapping.
          </p>
        </header>
        <WorkspaceShellLoadBoundary context={context} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Plugin Studio V2
        </h1>
        <p className="text-sm text-muted-foreground">
          Workspace shell with locked tabs and draft bootstrapping.
        </p>
      </header>

      <WorkspaceShellLoadBoundary context={context}>
        <Tabs
          value={activeTab}
          onValueChange={(nextTab) => {
            navigate({
              search: (previousSearch) => ({
                ...previousSearch,
                tab: nextTab,
              }),
              replace: true,
            });
          }}
        >
          <TabsList>
            {LOCKED_WORKSPACE_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {LOCKED_WORKSPACE_TABS.map((tab) =>
            mountedTabs.has(tab.id) ? (
              <TabsContent key={tab.id} value={tab.id}>
                <article className="rounded-md border border-border bg-card p-4">
                  <h2 className="text-base font-medium">{tab.label}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tab.description}
                  </p>
                  <dl className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                    <div>
                      <dt className="font-medium">Plugin ID</dt>
                      <dd className="text-muted-foreground">
                        {context.pluginId}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Draft ID</dt>
                      <dd className="text-muted-foreground">
                        {context.draftId}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="font-medium">Stable URL</dt>
                      <dd className="break-all text-muted-foreground">
                        {toWorkspaceShellTabHref({
                          tab: tab.id,
                          draftId: context.draftId,
                          pluginId: context.pluginId,
                        })}
                      </dd>
                    </div>
                  </dl>
                </article>
              </TabsContent>
            ) : null,
          )}
        </Tabs>
      </WorkspaceShellLoadBoundary>
    </section>
  );
}

function WorkspaceShellLoadBoundary(props: {
  context: WorkspaceDraftContext | undefined;
  children: React.ReactNode;
}) {
  if (!props.context) {
    return (
      <article className="rounded-md border border-dashed border-border bg-muted/30 p-4">
        <h2 className="text-base font-medium">Workspace shell unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a plugin and draft to load workspace.
        </p>
      </article>
    );
  }

  return <>{props.children}</>;
}
