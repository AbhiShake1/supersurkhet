import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

type PluginStudioGlobalCommandProject = {
  id: string;
  name: string;
  slug?: string;
};

type PluginStudioGlobalCommandPlugin = {
  id: string;
  projectId: string;
  pluginId: string;
  title: string;
  description?: string;
};

type PluginStudioGlobalCommandAction = {
  id: string;
  label: string;
  keywords?: string;
  shortcut?: string;
  onSelect: () => void;
};

type PluginStudioGlobalCommandProps = {
  projects: PluginStudioGlobalCommandProject[];
  plugins: PluginStudioGlobalCommandPlugin[];
  actions?: PluginStudioGlobalCommandAction[];
  onSelectProject: (projectId: string) => void;
  onSelectPlugin: (projectId: string, pluginId: string) => void;
  triggerLabel?: string;
  placeholder?: string;
};

export function PluginStudioGlobalCommand({
  projects,
  plugins,
  actions = [],
  onSelectProject,
  onSelectPlugin,
  triggerLabel = 'Search anything',
  placeholder = 'Search projects and plugins...',
}: PluginStudioGlobalCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const projectNameById = useMemo(
    () =>
      new Map(projects.map((project) => [project.id, project.name] as const)),
    [projects],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setIsOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className="flex h-9 min-w-[260px] items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" />
          {triggerLabel}
        </span>
        <span className="text-xs">Ctrl/⌘ K</span>
      </button>
      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={triggerLabel}
        description="Search projects and plugins across your organization."
      >
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {actions.length > 0 ? (
            <CommandGroup heading="Actions">
              {actions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${action.keywords ?? ''}`}
                  onSelect={() => {
                    setIsOpen(false);
                    action.onSelect();
                  }}
                >
                  {action.label}
                  <CommandShortcut>
                    {action.shortcut ?? 'Action'}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {actions.length > 0 ? <CommandSeparator /> : null}
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`${project.name} ${project.slug ?? ''} ${project.id}`}
                onSelect={() => {
                  setIsOpen(false);
                  onSelectProject(project.id);
                }}
              >
                {project.name}
                <CommandShortcut>Project</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Plugins">
            {plugins.map((plugin) => {
              const projectLabel =
                projectNameById.get(plugin.projectId) || 'Unknown project';
              return (
                <CommandItem
                  key={plugin.id}
                  value={`${plugin.title} ${plugin.pluginId} ${plugin.description ?? ''} ${projectLabel} ${plugin.projectId}`}
                  onSelect={() => {
                    setIsOpen(false);
                    onSelectPlugin(plugin.projectId, plugin.pluginId);
                  }}
                >
                  <span className="truncate">{plugin.title}</span>
                  <span className="ml-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
                    {projectLabel}
                  </span>
                  <CommandShortcut>Plugin</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
