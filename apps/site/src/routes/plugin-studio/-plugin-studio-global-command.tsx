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
import {
  type ShortcutBinding,
  UI_BUILDER_FOCUS_SHORTCUTS,
  useShortcutBinding,
} from '@/components/ui/keyboard-shortcuts';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';

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
  disabled?: boolean;
  onSelect: () => void;
};

type FocusModeStoreSlice = {
  focusStack?: string[];
  focusSelectedLayer?: (selectedLayerId?: string | null) => void;
  exitFocus?: () => void;
  resetFocus?: () => void;
  getEffectiveCanvasRootId?: (
    page: ComponentLayer | null | undefined,
  ) => string | null;
};

function renderBindingLabel(binding: ShortcutBinding): string {
  const parts: string[] = [];
  if (binding.meta) parts.push('Cmd');
  if (binding.ctrl) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  if (binding.key === ' ') {
    parts.push('Space');
  } else if (binding.key.length === 1) {
    parts.push(binding.key.toUpperCase());
  } else {
    parts.push(binding.key);
  }
  return parts.join(' + ');
}

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
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const selectedPage = useLayerStore((state) =>
    state.findLayerById(state.selectedPageId),
  ) as ComponentLayer | undefined;
  const focusModeStore = useEditorStore(
    (state) => state as unknown as FocusModeStoreSlice,
  );
  const focusSelectedBinding = useShortcutBinding(
    UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.id,
    UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.defaultBinding,
  );
  const exitFocusBinding = useShortcutBinding(
    UI_BUILDER_FOCUS_SHORTCUTS.exitFocus.id,
    UI_BUILDER_FOCUS_SHORTCUTS.exitFocus.defaultBinding,
  );
  const projectNameById = useMemo(
    () =>
      new Map(projects.map((project) => [project.id, project.name] as const)),
    [projects],
  );
  const isFocusModeAvailable =
    typeof focusModeStore.focusSelectedLayer === 'function' &&
    typeof focusModeStore.exitFocus === 'function' &&
    typeof focusModeStore.resetFocus === 'function';
  const effectiveCanvasRootId =
    focusModeStore.getEffectiveCanvasRootId?.(selectedPage);
  const isFocusActive =
    (focusModeStore.focusStack?.length ?? 0) > 0 ||
    (effectiveCanvasRootId != null && effectiveCanvasRootId !== selectedPageId);
  const canFocusSelected =
    isFocusModeAvailable &&
    Boolean(selectedLayerId) &&
    selectedLayerId !== selectedPageId;

  const focusActions = useMemo<PluginStudioGlobalCommandAction[]>(() => {
    if (!isFocusModeAvailable) return [];
    return [
      {
        id: 'focus-selected-component',
        label: 'Focus selected component',
        keywords: 'builder focus isolate selected',
        shortcut: renderBindingLabel(focusSelectedBinding),
        disabled: !canFocusSelected,
        onSelect: () => {
          focusModeStore.focusSelectedLayer?.(selectedLayerId);
        },
      },
      {
        id: 'exit-focus-mode',
        label: 'Exit focus mode',
        keywords: 'builder focus back parent',
        shortcut: renderBindingLabel(exitFocusBinding),
        disabled: !isFocusActive,
        onSelect: () => {
          focusModeStore.exitFocus?.();
        },
      },
      {
        id: 'reset-focus-mode',
        label: 'Reset focus to page',
        keywords: 'builder focus reset root page',
        disabled: !isFocusActive,
        onSelect: () => {
          focusModeStore.resetFocus?.();
        },
      },
    ];
  }, [
    canFocusSelected,
    exitFocusBinding,
    focusModeStore,
    focusSelectedBinding,
    isFocusActive,
    isFocusModeAvailable,
    selectedLayerId,
  ]);
  const mergedActions = useMemo(
    () => [...focusActions, ...actions],
    [actions, focusActions],
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
          {mergedActions.length > 0 ? (
            <CommandGroup heading="Actions">
              {mergedActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${action.keywords ?? ''}`}
                  disabled={action.disabled}
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
          {mergedActions.length > 0 ? <CommandSeparator /> : null}
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
