import { useAuth } from '@/components/auth-provider';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginProjectDoc,
  PluginProjectMemberDoc,
} from '@/lib/plugins/types';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CirclePause, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export const Route = createFileRoute('/plugin-studio/$projectId/')({
  component: PluginStudioProjectRoute,
});

function buildActorUserIdAliases(
  user:
    | {
        pub?: string;
        _?: { soul?: string };
      }
    | null
    | undefined,
): string[] {
  const aliases = new Set<string>();
  const append = (value: string | undefined) => {
    const normalized = value?.trim();
    if (!normalized) return;
    aliases.add(normalized);
    const slashTail = normalized.split('/').filter(Boolean).at(-1);
    if (slashTail) aliases.add(slashTail);
  };
  append(user?.pub);
  append(user?._?.soul);
  const userRecord = user as Record<string, unknown> | null | undefined;
  append(typeof userRecord?.id === 'string' ? userRecord.id : undefined);
  append(typeof userRecord?.userId === 'string' ? userRecord.userId : undefined);
  return [...aliases];
}

function toPluginIdSeed(project: PluginProjectDoc | null) {
  const seed = project?.slug || project?.name || 'plugin';
  const normalized = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `plugin.${normalized || 'example'}`;
}

function PluginStudioProjectRoute() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const actorUserIdAliases = useMemo(() => buildActorUserIdAliases(user), [user]);
  const actorUserIdSet = useMemo(() => new Set(actorUserIdAliases), [actorUserIdAliases]);

  const { data: projectRows = [] } = api.pluginProject.useGet();
  const { data: memberRows = [] } = api.pluginProjectMember.useGet();
  const { data: draftRows = [] } = api.pluginDraft.useGet();
  const { data: installRows = [] } = api.businessPluginInstall.useGet({ keys: [projectId] });
  const { data: draftInstallRows = [] } = api.businessPluginDraftInstall.useGet({ keys: [projectId] });

  const projects = projectRows as PluginProjectDoc[];
  const members = memberRows as PluginProjectMemberDoc[];
  const drafts = draftRows as PluginDraftDoc[];
  const installs = installRows as BusinessPluginInstallDoc[];
  const draftInstalls = draftInstallRows as BusinessPluginDraftInstallDoc[];

  const project = useMemo(
    () => projects.find((entry) => entry.id === projectId) ?? null,
    [projectId, projects],
  );

  const canAccess = useMemo(() => {
    if (!project) return false;
    if (actorUserIdSet.has(project.ownerUserId)) return true;
    return members.some(
      (member) => member.projectId === projectId && actorUserIdSet.has(member.userId),
    );
  }, [actorUserIdSet, members, project, projectId]);

  const pluginCards = useMemo(() => {
    const pluginIds = new Set<string>();

    for (const draft of drafts) {
      if ((draft.projectId ?? '') === projectId && draft.pluginId) {
        pluginIds.add(draft.pluginId);
      }
    }
    for (const install of installs) {
      if (install.pluginId) pluginIds.add(install.pluginId);
    }
    for (const draftInstall of draftInstalls) {
      if (draftInstall.pluginId) pluginIds.add(draftInstall.pluginId);
    }

    const query = search.trim().toLowerCase();
    return [...pluginIds]
      .map((pluginId) => {
        const publishedInstall = installs.find((entry) => entry.pluginId === pluginId);
        const draftInstall = draftInstalls.find((entry) => entry.pluginId === pluginId);
        const status: 'active' | 'paused' =
          publishedInstall?.status === 'paused' || draftInstall?.status === 'paused'
            ? 'paused'
            : 'active';
        return {
          id: pluginId,
          pluginId,
          title: pluginId.replace(/^plugin\./, ''),
          status,
          cloudRegion: status === 'paused' ? 'AWS | ap-southeast-1' : 'AWS | us-east-1',
        };
      })
      .filter((card) => {
        if (!query) return true;
        return (
          card.pluginId.toLowerCase().includes(query) ||
          card.title.toLowerCase().includes(query)
        );
      });
  }, [draftInstalls, drafts, installs, projectId, search]);

  if (isAuthLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Studio</CardTitle>
          </CardHeader>
          <CardContent>Sign in to access this project.</CardContent>
        </Card>
      </div>
    );
  }

  if (!project || !canAccess) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Project not found</CardTitle>
          </CardHeader>
          <CardContent>Project does not exist or you do not have access.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center justify-center" aria-label="Go to homepage">
              <Logo className="size-8" />
            </Link>
            <div className="text-sm text-muted-foreground">/</div>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => void navigate({ to: '/plugin-studio' })}
            >
              Projects
            </button>
            <div className="text-sm text-muted-foreground">/</div>
            <div className="text-sm font-medium">{project.name}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-8 py-12">
        <section className="flex items-center justify-between">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground/95">Plugins</h1>
          <Button
            type="button"
            className="h-10 rounded-md px-4"
            onClick={() =>
              void navigate({
                to: '/plugin-studio/$projectId/$pluginId',
                params: { projectId, pluginId: toPluginIdSeed(project) },
              })
            }
          >
            <Plus className="mr-2 size-4" />
            New plugin
          </Button>
        </section>

        <div className="mt-10 max-w-md">
          <div className="flex h-11 items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search for a plugin"
              className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {pluginCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() =>
                void navigate({
                  to: '/plugin-studio/$projectId/$pluginId',
                  params: { projectId, pluginId: card.pluginId },
                })
              }
              className="rounded-xl border border-border/70 bg-card/70 p-6 text-left transition hover:border-border"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-semibold tracking-tight">{card.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{card.cloudRegion}</p>
                </div>
              </div>
              <div className="mt-7">
                <span className="rounded-full border border-border/80 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                  {card.status}
                </span>
              </div>
              <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                <CirclePause className="size-4" />
                <span>Plugin is {card.status}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
