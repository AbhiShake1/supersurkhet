import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Pencil, Plus, Search } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HoverablePopover,
  HoverablePopoverContent,
  HoverablePopoverTrigger,
} from '@/components/ui/hoverable-popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  PluginDraftDoc,
  PluginProjectDoc,
  PluginProjectMemberDoc,
} from '@/lib/plugins/types';
import { PluginStudioGlobalCommand } from '../-plugin-studio-global-command';
import {
  groupPluginCardsByStatus,
  resolvePluginCardStatus,
} from '../-plugin-studio-project-status-groups';

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
  append(
    typeof userRecord?.userId === 'string' ? userRecord.userId : undefined,
  );
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

function toDisplayPluginTitle(input: string | undefined, pluginId: string) {
  const fallback = pluginId.replace(/^plugin\./, '');
  const normalized = input?.trim() || fallback;
  const withoutSuffix = normalized.replace(
    /(?:\s*\([^)]*\)\s*$)|(?:\s*\[[^\]]*]\s*$)/,
    '',
  );
  return withoutSuffix.trim() || fallback;
}

function toDraftRecencyKey(draft: PluginDraftDoc) {
  return `${draft.updatedAt ?? ''}:${draft.createdAt ?? ''}:${draft.draftId}`;
}

function PluginStudioProjectRoute() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [projectsPopoverSearch, setProjectsPopoverSearch] = useState('');
  const [hoveredPluginsPopoverSearch, setHoveredPluginsPopoverSearch] =
    useState('');
  const [projectPluginsPopoverSearch, setProjectPluginsPopoverSearch] =
    useState('');
  const [hoveredProjectId, setHoveredProjectId] = useState(projectId);
  const [editingField, setEditingField] = useState<{
    pluginId: string;
    field: 'title' | 'description';
  } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const actorUserIdAliases = useMemo(
    () => buildActorUserIdAliases(user),
    [user],
  );
  const actorUserIdSet = useMemo(
    () => new Set(actorUserIdAliases),
    [actorUserIdAliases],
  );

  const { data: projectRows = [] } = api.pluginProject.useGet();
  const { data: memberRows = [] } = api.pluginProjectMember.useGet();
  const { data: draftRows = [], refetch: refetchDrafts } =
    api.pluginDraft.useGet();
  const updateDraftMutation = api.pluginDraft.useUpdate();
  const { data: installRows = [] } = api.businessPluginInstall.useGet({
    keys: [projectId],
  });
  const { data: draftInstallRows = [] } = api.businessPluginDraftInstall.useGet(
    { keys: [projectId] },
  );

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
      (member) =>
        member.projectId === projectId && actorUserIdSet.has(member.userId),
    );
  }, [actorUserIdSet, members, project, projectId]);

  const accessibleProjects = useMemo(() => {
    const memberProjectIdSet = new Set(
      members
        .filter((member) => actorUserIdSet.has(member.userId))
        .map((member) => member.projectId),
    );
    return projects.filter(
      (entry) =>
        actorUserIdSet.has(entry.ownerUserId) ||
        memberProjectIdSet.has(entry.id),
    );
  }, [actorUserIdSet, members, projects]);
  const accessibleProjectIdSet = useMemo(
    () => new Set(accessibleProjects.map((entry) => entry.id)),
    [accessibleProjects],
  );

  const pluginCards = useMemo(() => {
    const pluginIds = new Set<string>();
    const latestDraftByPluginId = new Map<string, PluginDraftDoc>();

    for (const draft of drafts) {
      if ((draft.projectId ?? '') === projectId && draft.pluginId) {
        pluginIds.add(draft.pluginId);
        const existing = latestDraftByPluginId.get(draft.pluginId);
        if (
          !existing ||
          toDraftRecencyKey(draft) > toDraftRecencyKey(existing)
        ) {
          latestDraftByPluginId.set(draft.pluginId, draft);
        }
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
        const publishedInstall = installs.find(
          (entry) => entry.pluginId === pluginId,
        );
        const draftInstall = draftInstalls.find(
          (entry) => entry.pluginId === pluginId,
        );
        const installStatus: 'active' | 'paused' | undefined =
          publishedInstall?.status === 'paused' ||
          draftInstall?.status === 'paused'
            ? 'paused'
            : publishedInstall || draftInstall
              ? 'active'
              : undefined;
        const status = resolvePluginCardStatus({
          latestDraftStatus: latestDraftByPluginId.get(pluginId)?.status,
          installStatus,
        });
        const latestDraft = latestDraftByPluginId.get(pluginId);
        const description = latestDraft?.description?.trim() || '';
        const title = toDisplayPluginTitle(latestDraft?.title, pluginId);
        return {
          id: pluginId,
          pluginId,
          draftId: latestDraft?.draftId,
          title,
          status,
          description,
        };
      })
      .filter((card) => {
        if (!query) return true;
        return (
          card.pluginId.toLowerCase().includes(query) ||
          card.title.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [draftInstalls, drafts, installs, projectId, search]);

  const groupedPluginCards = useMemo(
    () => groupPluginCardsByStatus(pluginCards),
    [pluginCards],
  );
  const organizationPluginOptions = useMemo(() => {
    const latestByCompositeKey = new Map<string, PluginDraftDoc>();
    for (const draft of drafts) {
      if (!draft.projectId || !accessibleProjectIdSet.has(draft.projectId)) {
        continue;
      }
      if (!draft.pluginId) continue;
      const key = `${draft.projectId}::${draft.pluginId}`;
      const existing = latestByCompositeKey.get(key);
      if (!existing || toDraftRecencyKey(draft) > toDraftRecencyKey(existing)) {
        latestByCompositeKey.set(key, draft);
      }
    }
    return [...latestByCompositeKey.values()]
      .map((draft) => ({
        id: `${draft.projectId}::${draft.pluginId}`,
        projectId: draft.projectId as string,
        pluginId: draft.pluginId,
        title: toDisplayPluginTitle(draft.title, draft.pluginId),
        description: draft.description?.trim() || '',
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [accessibleProjectIdSet, drafts]);
  const organizationPluginsByProjectId = useMemo(() => {
    const byProjectId = new Map<
      string,
      Array<{
        id: string;
        projectId: string;
        pluginId: string;
        title: string;
      }>
    >();
    for (const option of organizationPluginOptions) {
      const options = byProjectId.get(option.projectId) ?? [];
      options.push(option);
      byProjectId.set(option.projectId, options);
    }
    return byProjectId;
  }, [organizationPluginOptions]);

  useEffect(() => {
    const hasHoveredProject = accessibleProjectIdSet.has(hoveredProjectId);
    if (hasHoveredProject) return;
    const fallbackProjectId = accessibleProjects[0]?.id ?? projectId;
    setHoveredProjectId(fallbackProjectId);
  }, [accessibleProjectIdSet, accessibleProjects, hoveredProjectId, projectId]);

  const beginInlineEdit = (
    event: MouseEvent,
    card: {
      pluginId: string;
      title: string;
      description?: string;
    },
    field: 'title' | 'description',
  ) => {
    event.stopPropagation();
    setEditingField({ pluginId: card.pluginId, field });
    setEditingValue(field === 'title' ? card.title : (card.description ?? ''));
  };

  const handleSaveInlineEdit = async () => {
    if (!editingField) return;
    const targetCard = pluginCards.find(
      (candidate) => candidate.pluginId === editingField.pluginId,
    );
    if (!targetCard?.draftId) {
      setEditingField(null);
      setEditingValue('');
      return;
    }
    const targetDraft = drafts.find(
      (candidate) => candidate.draftId === targetCard.draftId,
    );
    if (!targetDraft) {
      setEditingField(null);
      setEditingValue('');
      return;
    }

    const nextValue = editingValue.trim();
    const nextTitle =
      editingField.field === 'title'
        ? nextValue || targetCard.pluginId.replace(/^plugin\./, '')
        : targetDraft.title;
    const nextDescription =
      editingField.field === 'description'
        ? nextValue || undefined
        : targetDraft.description;

    try {
      await updateDraftMutation.mutateAsync({
        ...targetDraft,
        title: nextTitle,
        description: nextDescription,
        updatedAt: new Date().toISOString(),
      } as never);
      await refetchDrafts();
    } catch (error) {
      console.error(error);
    } finally {
      setEditingField(null);
      setEditingValue('');
    }
  };

  const stopInlineEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const hoveredProject = useMemo(
    () =>
      accessibleProjects.find((entry) => entry.id === hoveredProjectId) ??
      project,
    [accessibleProjects, hoveredProjectId, project],
  );
  const hoveredProjectPlugins = useMemo(
    () => organizationPluginsByProjectId.get(hoveredProjectId) ?? [],
    [hoveredProjectId, organizationPluginsByProjectId],
  );
  const filteredPopoverProjects = useMemo(() => {
    const query = projectsPopoverSearch.trim().toLowerCase();
    if (!query) return accessibleProjects;
    return accessibleProjects.filter((entry) =>
      `${entry.name} ${entry.slug ?? ''} ${entry.id}`
        .toLowerCase()
        .includes(query),
    );
  }, [accessibleProjects, projectsPopoverSearch]);
  const filteredHoveredProjectPlugins = useMemo(() => {
    const query = hoveredPluginsPopoverSearch.trim().toLowerCase();
    if (!query) return hoveredProjectPlugins;
    return hoveredProjectPlugins.filter((entry) =>
      `${entry.title} ${entry.pluginId}`.toLowerCase().includes(query),
    );
  }, [hoveredPluginsPopoverSearch, hoveredProjectPlugins]);
  const filteredProjectPluginsPopoverCards = useMemo(() => {
    const query = projectPluginsPopoverSearch.trim().toLowerCase();
    if (!query) return pluginCards;
    return pluginCards.filter((card) =>
      `${card.title} ${card.pluginId} ${card.status} ${card.description ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [pluginCards, projectPluginsPopoverSearch]);

  if (isAuthLoading)
    return <div className="p-8 text-muted-foreground">Loading...</div>;

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
          <CardContent>
            Project does not exist or you do not have access.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center"
              aria-label="Go to homepage"
            >
              <Logo className="size-8" />
            </Link>
            <div className="text-sm text-muted-foreground">/</div>
            <HoverablePopover>
              <HoverablePopoverTrigger asChild>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
                  onMouseEnter={() => setHoveredProjectId(projectId)}
                  onClick={() => void navigate({ to: '/plugin-studio' })}
                >
                  Projects
                </button>
              </HoverablePopoverTrigger>
              <HoverablePopoverContent
                align="start"
                sideOffset={10}
                className="w-[640px] p-0"
              >
                <div className="grid grid-cols-[240px_minmax(0,1fr)]">
                  <div className="border-r border-border/70 p-2">
                    <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Projects
                    </p>
                    <div className="mb-2 px-2">
                      <Input
                        value={projectsPopoverSearch}
                        onChange={(event) =>
                          setProjectsPopoverSearch(event.target.value)
                        }
                        placeholder="Search projects"
                        className="h-8"
                        aria-label="Search projects"
                      />
                    </div>
                    <div className="max-h-[320px] space-y-1 overflow-auto pr-1">
                      {filteredPopoverProjects.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                          No projects found.
                        </p>
                      ) : null}
                      {filteredPopoverProjects.map((entry) => {
                        const pluginCount =
                          organizationPluginsByProjectId.get(entry.id)
                            ?.length ?? 0;
                        const isActive = entry.id === hoveredProjectId;
                        return (
                          <button
                            type="button"
                            key={entry.id}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${
                              isActive
                                ? 'bg-muted/60 text-foreground'
                                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            }`}
                            onMouseEnter={() => setHoveredProjectId(entry.id)}
                            onFocus={() => setHoveredProjectId(entry.id)}
                            onClick={() => {
                              void navigate({
                                to: '/plugin-studio/$projectId',
                                params: { projectId: entry.id },
                              });
                            }}
                          >
                            <span className="truncate pr-2">{entry.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {pluginCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {hoveredProject
                        ? `${hoveredProject.name} plugins`
                        : 'Plugins'}
                    </p>
                    <div className="mt-2">
                      <Input
                        value={hoveredPluginsPopoverSearch}
                        onChange={(event) =>
                          setHoveredPluginsPopoverSearch(event.target.value)
                        }
                        placeholder="Search plugins"
                        className="h-8"
                        aria-label="Search plugins"
                      />
                    </div>
                    <div className="mt-2 max-h-[320px] space-y-1 overflow-auto pr-1">
                      {filteredHoveredProjectPlugins.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                          No plugins found.
                        </p>
                      ) : (
                        filteredHoveredProjectPlugins.map((entry) => (
                          <button
                            type="button"
                            key={entry.id}
                            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                            onClick={() => {
                              void navigate({
                                to: '/plugin-studio/$projectId/$pluginId',
                                params: {
                                  projectId: entry.projectId,
                                  pluginId: entry.pluginId,
                                },
                              });
                            }}
                          >
                            <span className="truncate pr-2">{entry.title}</span>
                            <span className="text-xs opacity-70">
                              {entry.pluginId}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </HoverablePopoverContent>
            </HoverablePopover>
            <div className="text-sm text-muted-foreground">/</div>
            <HoverablePopover>
              <HoverablePopoverTrigger asChild>
                <button
                  type="button"
                  className="text-sm font-medium text-foreground/90 transition hover:text-foreground"
                >
                  {project.name}
                </button>
              </HoverablePopoverTrigger>
              <HoverablePopoverContent
                align="start"
                sideOffset={10}
                className="w-[420px] p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {project.name} plugins
                </p>
                <div className="mt-2">
                  <Input
                    value={projectPluginsPopoverSearch}
                    onChange={(event) =>
                      setProjectPluginsPopoverSearch(event.target.value)
                    }
                    placeholder="Search plugins"
                    className="h-8"
                    aria-label={`Search ${project.name} plugins`}
                  />
                </div>
                <div className="mt-2 max-h-[320px] space-y-1 overflow-auto pr-1">
                  {filteredProjectPluginsPopoverCards.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      No plugins found.
                    </p>
                  ) : (
                    filteredProjectPluginsPopoverCards.map((card) => (
                      <button
                        type="button"
                        key={card.id}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                        onClick={() => {
                          void navigate({
                            to: '/plugin-studio/$projectId/$pluginId',
                            params: {
                              projectId,
                              pluginId: card.pluginId,
                            },
                          });
                        }}
                      >
                        <span className="truncate pr-2">{card.title}</span>
                        <span className="text-xs uppercase opacity-70">
                          {card.status}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </HoverablePopoverContent>
            </HoverablePopover>
          </div>
          <PluginStudioGlobalCommand
            projects={accessibleProjects}
            plugins={organizationPluginOptions}
            actions={[
              {
                id: 'new-plugin',
                label: 'New plugin',
                onSelect: () => {
                  void navigate({
                    to: '/plugin-studio/$projectId/$pluginId',
                    params: { projectId, pluginId: toPluginIdSeed(project) },
                  });
                },
              },
              {
                id: 'view-projects',
                label: 'View all projects',
                onSelect: () => {
                  void navigate({ to: '/plugin-studio' });
                },
              },
            ]}
            placeholder="Search projects, plugins, and actions..."
            onSelectProject={(nextProjectId) => {
              void navigate({
                to: '/plugin-studio/$projectId',
                params: { projectId: nextProjectId },
              });
            }}
            onSelectPlugin={(nextProjectId, pluginId) => {
              void navigate({
                to: '/plugin-studio/$projectId/$pluginId',
                params: {
                  projectId: nextProjectId,
                  pluginId,
                },
              });
            }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-8 py-12">
        <section className="flex items-center justify-between">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground/95">
            Plugins
          </h1>
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

        {groupedPluginCards.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-card/70 p-6 text-sm text-muted-foreground">
            No plugins found for this project.
          </div>
        ) : null}

        {groupedPluginCards.map((group) => (
          <section key={group.status} className="mt-8 first:mt-6">
            <div className="mb-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {group.label}
                <span className="ml-2 inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {`${group.items.length}/${pluginCards.length}`}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.items.map((card) => (
                // biome-ignore lint/a11y/useSemanticElements: Card supports inline editing controls that cannot be nested inside button.
                <div
                  key={card.id}
                  onClick={() => {
                    if (editingField?.pluginId === card.pluginId) return;
                    void navigate({
                      to: '/plugin-studio/$projectId/$pluginId',
                      params: { projectId, pluginId: card.pluginId },
                    });
                  }}
                  onKeyDown={(event) => {
                    if (editingField?.pluginId === card.pluginId) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    void navigate({
                      to: '/plugin-studio/$projectId/$pluginId',
                      params: { projectId, pluginId: card.pluginId },
                    });
                  }}
                  role="button"
                  tabIndex={0}
                  className="rounded-xl border border-border/70 bg-card/70 p-6 text-left transition hover:border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {editingField?.pluginId === card.pluginId &&
                      editingField.field === 'title' ? (
                        <Input
                          value={editingValue}
                          autoFocus
                          placeholder="Plugin name"
                          onChange={(event) =>
                            setEditingValue(event.target.value)
                          }
                          onClick={(event) => event.stopPropagation()}
                          onBlur={() => void handleSaveInlineEdit()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleSaveInlineEdit();
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              event.stopPropagation();
                              stopInlineEdit();
                            }
                          }}
                          className="h-10 text-xl font-semibold"
                        />
                      ) : (
                        <div className="group/title flex items-center gap-2">
                          <p className="text-3xl font-semibold tracking-tight">
                            {card.title}
                          </p>
                          <button
                            type="button"
                            aria-label={`Edit ${card.title} title`}
                            onClick={(event) =>
                              beginInlineEdit(event, card, 'title')
                            }
                            className="text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 group-hover/title:opacity-100 group-focus-within/title:opacity-100 hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </div>
                      )}
                      {editingField?.pluginId === card.pluginId &&
                      editingField.field === 'description' ? (
                        <Textarea
                          value={editingValue}
                          autoFocus
                          onChange={(event) =>
                            setEditingValue(event.target.value)
                          }
                          onClick={(event) => event.stopPropagation()}
                          onBlur={() => void handleSaveInlineEdit()}
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              event.stopPropagation();
                              stopInlineEdit();
                            }
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleSaveInlineEdit();
                            }
                          }}
                          className="mt-2 min-h-[96px] resize-none"
                        />
                      ) : null}
                      {editingField?.pluginId === card.pluginId &&
                      editingField.field === 'description' ? null : (
                        <div className="group/description mt-2 flex items-start gap-2">
                          <p className="text-sm text-muted-foreground">
                            {card.description || 'No description yet'}
                          </p>
                          <button
                            type="button"
                            aria-label={`Edit ${card.title} description`}
                            onClick={(event) =>
                              beginInlineEdit(event, card, 'description')
                            }
                            className="mt-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 group-hover/description:opacity-100 group-focus-within/description:opacity-100 hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-7">
                    <span className="rounded-full border border-border/80 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      {card.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
