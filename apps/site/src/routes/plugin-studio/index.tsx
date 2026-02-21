import { useAuth } from '@/components/auth-provider';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { PluginProjectDoc, PluginProjectMemberDoc } from '@/lib/plugins/types';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Building2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/plugin-studio/')({
  component: PluginStudioProjectsRoute,
});

export function PluginStudioPage() {
  return <PluginStudioProjectsRoute />;
}

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

function toStableSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function PluginStudioProjectsRoute() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const actorUserIdAliases = useMemo(() => buildActorUserIdAliases(user), [user]);
  const actorUserId = actorUserIdAliases[0] ?? 'anon';
  const actorUserIdSet = useMemo(() => new Set(actorUserIdAliases), [actorUserIdAliases]);

  const { data: projectRows = [], refetch: refetchProjects } = api.pluginProject.useGet();
  const { data: memberRows = [], refetch: refetchMembers } =
    api.pluginProjectMember.useGet();
  const createProjectMutation = api.pluginProject.useCreate();
  const createProjectMemberMutation = api.pluginProjectMember.useCreate();

  const projects = projectRows as PluginProjectDoc[];
  const members = memberRows as PluginProjectMemberDoc[];

  const accessibleProjects = useMemo(() => {
    const memberProjectIdSet = new Set(
      members
        .filter((member) => actorUserIdSet.has(member.userId))
        .map((member) => member.projectId),
    );
    return projects.filter(
      (project) =>
        actorUserIdSet.has(project.ownerUserId) || memberProjectIdSet.has(project.id),
    );
  }, [actorUserIdSet, members, projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return accessibleProjects;
    return accessibleProjects.filter((project) => {
      const searchSpace = [project.name, project.slug, project.description, project.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchSpace.includes(normalizedQuery);
    });
  }, [accessibleProjects, query]);

  const handleCreateProject = async () => {
    const normalizedName = projectName.trim();
    if (!normalizedName) {
      toast.error('Project name is required.');
      return;
    }
    const slug = toStableSegment(normalizedName);
    const id = `project.${slug}`;
    const now = new Date().toISOString();

    try {
      await createProjectMutation.mutateAsync({
        id,
        slug,
        name: normalizedName,
        description: projectDescription.trim() || undefined,
        ownerUserId: actorUserId,
        visibility: 'private',
        createdAt: now,
        updatedAt: now,
      } as never);
      await createProjectMemberMutation.mutateAsync({
        id: `${id}::${actorUserId}`,
        projectId: id,
        userId: actorUserId,
        role: 'owner',
        joinedAt: now,
      } as never);
      await Promise.all([refetchProjects(), refetchMembers()]);
      setIsCreateOpen(false);
      setProjectName('');
      setProjectDescription('');
      void navigate({ to: '/plugin-studio/$projectId', params: { projectId: id } });
    } catch (error) {
      console.error(error);
      toast.error('Creating project failed.');
    }
  };

  if (isAuthLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Studio</CardTitle>
          </CardHeader>
          <CardContent>Sign in to access projects.</CardContent>
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
            <div className="text-sm font-medium">Projects</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-8 py-12">
        <section className="flex items-center justify-between">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground/95">
            Your Projects
          </h1>
          <Button type="button" className="h-10 rounded-md px-4" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New project
          </Button>
        </section>

        <div className="mt-10 max-w-md">
          <div className="flex h-11 items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for a project"
              className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() =>
                void navigate({
                  to: '/plugin-studio/$projectId',
                  params: { projectId: project.id },
                })
              }
              className="rounded-xl border border-border/70 bg-card/70 px-6 py-5 text-left transition hover:border-border"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/20 text-muted-foreground">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <p className="text-2xl font-medium tracking-tight">{project.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{project.id}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[780px]">
          <DialogHeader>
            <DialogTitle className="text-3xl">Create a new project</DialogTitle>
            <DialogDescription className="text-base">
              Projects group plugins and collaborators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
              <Label className="pt-2 text-base">Name</Label>
              <Input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
                className="h-12 text-base"
              />
            </div>
            <div className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4">
              <Label className="pt-2 text-base">Description</Label>
              <Input
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Project description"
                className="h-12 text-base"
              />
            </div>
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateProject()}>
              Create project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
