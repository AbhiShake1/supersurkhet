'use client';
import {
  Command as CommandIcon,
  Crosshair,
  MousePointer,
  Plus,
  Sparkles,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from 'react-zoom-pan-pinch';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import {
  AiMutationPermissionDialog,
  type AiMutationPermissionOptionValue,
} from '@/components/permission-gate/ai-mutation-permission-dialog';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import AutoFrame from '@/components/ui/ui-builder/internal/canvas/auto-frame';
import { ResizableWrapper } from '@/components/ui/ui-builder/internal/canvas/resizable-wrapper';
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover';
import LayerRenderer from '@/components/ui/ui-builder/layer-renderer';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { evaluateAiSurfaceGate } from '@/lib/ai-policy/ai-surface-gates';
import {
  type AiPermissionPolicyStore,
  createAiPermissionPolicyStore,
} from '@/lib/ai-policy/permission-policy-store';
import {
  DndContextProvider,
  useComponentDragContext,
} from '@/lib/ui-builder/context/dnd-context';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import {
  countLayers,
  defaultLayers,
  useLayerStore,
} from '@/lib/ui-builder/store/layer-store';
import { cn } from '@/lib/utils';

// Static style objects to prevent recreation on every render
const WRAPPER_STYLE = {
  width: '100%',
  height: '100%',
} as const;

const CONTENT_STYLE = {
  width: '100%',
  height: '100%',
} as const;

const TRANSFORM_DIV_STYLE = {
  minHeight: '100vh',
  padding: '50px',
} as const;

const WHEEL_CONFIG = { step: 0.1 } as const;
const DOUBLE_CLICK_CONFIG = { disabled: false } as const;
const AI_MUTATION_POLICY_STORAGE_KEY = 'ui-builder-ai-mutation-policy-v1';

function appendClassTokens(
  existingClassName: string,
  tokens: string[],
): string {
  const next = new Set(
    existingClassName
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
  for (const token of tokens) {
    if (token.trim()) {
      next.add(token.trim());
    }
  }
  return [...next].join(' ');
}

export const UI_BUILDER_FOCUS_SHORTCUTS = {
  openCommandPalette: {
    id: 'uiBuilder.focus.openCommandPalette',
    label: 'Open focus command palette',
    description: 'Open focus mode actions for the active UI Builder canvas.',
    scope: 'UI Builder Focus',
    defaultBinding: {
      key: 'k',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  focusSelected: {
    id: 'uiBuilder.focus.focusSelected',
    label: 'Focus selected component',
    description: 'Zoom into selected component subtree in UI Builder.',
    scope: 'UI Builder Focus',
    defaultBinding: {
      key: 'f',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  exitFocus: {
    id: 'uiBuilder.focus.exitFocus',
    label: 'Zoom out one level',
    description: 'Exit one level from current component focus.',
    scope: 'UI Builder Focus',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  resetFocus: {
    id: 'uiBuilder.focus.resetFocus',
    label: 'Reset focus mode',
    description: 'Exit focus mode and return to full page canvas.',
    scope: 'UI Builder Focus',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
} as const;

export function findLayerPath(
  root: ComponentLayer | undefined,
  targetLayerId: string | null,
): ComponentLayer[] {
  if (!root || !targetLayerId) return [];
  if (root.id === targetLayerId) return [root];
  if (!Array.isArray(root.children)) return [];

  for (const child of root.children) {
    const childPath = findLayerPath(child, targetLayerId);
    if (childPath.length > 0) {
      return [root, ...childPath];
    }
  }

  return [];
}

export function isLayerInsideSubtree(
  root: ComponentLayer | undefined,
  targetLayerId: string | null,
): boolean {
  return findLayerPath(root, targetLayerId).length > 0;
}

export function sanitizeFocusStack(
  root: ComponentLayer | undefined,
  stack: string[],
): string[] {
  if (!root) return [];
  const next: string[] = [];

  for (const layerId of stack) {
    const path = findLayerPath(root, layerId);
    if (path.length < 2) break;
    next.push(layerId);
  }

  return next;
}

const ZoomControls: React.FC<{
  onPointerEventsToggle: (enabled: boolean) => void;
  pointerEventsEnabled: boolean;
  onFocusSelected: () => void;
  canFocusSelected: boolean;
  onExitFocus: () => void;
  canExitFocus: boolean;
}> = ({
  onPointerEventsToggle,
  pointerEventsEnabled,
  onFocusSelected,
  canFocusSelected,
  onExitFocus,
  canExitFocus,
}) => {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  const handleZoomIn = useCallback(() => zoomIn(), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut(), [zoomOut]);
  const handleReset = useCallback(() => resetTransform(), [resetTransform]);
  const handleTogglePointerEvents = useCallback(() => {
    onPointerEventsToggle(!pointerEventsEnabled);
  }, [onPointerEventsToggle, pointerEventsEnabled]);

  return (
    <TooltipProvider>
      <div className="absolute bottom-24 md:bottom-4 right-4 z-[1000] flex shadow-lg rounded-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-Focus"
              variant="secondary"
              className="size-14 md:size-10 rounded-l-full rounded-r-none border-r border-border [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={onFocusSelected}
              disabled={!canFocusSelected}
            >
              <span className="sr-only">Focus selected component</span>
              <Crosshair className="text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Focus selected</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-ExitFocus"
              variant="secondary"
              className="size-14 md:size-10 rounded-none border-r border-border [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={onExitFocus}
              disabled={!canExitFocus}
            >
              <span className="sr-only">Zoom out one level</span>
              <Undo2 className="text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom out one level</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-ZoomIn"
              variant="secondary"
              className="size-14 md:size-10 rounded-none border-r border-border [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={handleZoomIn}
            >
              <span className="sr-only">Zoom in</span>
              <ZoomIn className="text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom in</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-ZoomOut"
              variant="secondary"
              className="size-14 md:size-10 rounded-none border-r border-border [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={handleZoomOut}
            >
              <span className="sr-only">Zoom out</span>
              <ZoomOut className="text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Zoom out</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-Reset"
              variant="secondary"
              className="size-14 md:size-10 rounded-none border-r border-border [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={handleReset}
            >
              <span className="sr-only">Reset</span>
              <Crosshair className="text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Reset zoom and position</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="button-PointerEvents"
              variant={pointerEventsEnabled ? 'default' : 'secondary'}
              className="size-14 md:size-10 rounded-r-full rounded-l-none [&_svg]:size-7 [&_svg]:md:size-4"
              onClick={handleTogglePointerEvents}
            >
              <span className="sr-only">
                {pointerEventsEnabled
                  ? 'Disable pointer events'
                  : 'Enable pointer events'}
              </span>
              <MousePointer
                className={
                  pointerEventsEnabled
                    ? 'text-primary-foreground'
                    : 'text-secondary-foreground'
                }
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>
              {pointerEventsEnabled
                ? 'Disable page interaction'
                : 'Enable page interaction'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

interface EditorPanelProps {
  className?: string;
  focusModeEnabled?: boolean;
}

function useHasByoAiCredential() {
  const [state, setState] = useState({
    hasCredential: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCredentialState() {
      try {
        const response = await fetch('/v1/auth/providers', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled) {
            setState({
              hasCredential: false,
              isLoading: false,
            });
          }
          return;
        }

        const payload = (await response.json()) as {
          data?: Array<unknown>;
        };
        if (cancelled) return;
        setState({
          hasCredential: Array.isArray(payload.data) && payload.data.length > 0,
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setState({
          hasCredential: false,
          isLoading: false,
        });
      }
    }

    void loadCredentialState();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return state;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  className,
  focusModeEnabled = true,
}) => {
  const { isAuthenticated } = useAuth();
  const { hasCredential: hasByoAiCredential, isLoading: isByoAiLoading } =
    useHasByoAiCredential();
  const {
    selectLayer,
    selectedLayerId,
    findLayerById,
    duplicateLayer,
    removeLayer,
    selectedPageId,
  } = useLayerStore();
  const previewMode = useEditorStore((state) => state.previewMode);
  const componentRegistry = useEditorStore((state) => state.registry);
  const selectedLayer = findLayerById(selectedLayerId) as ComponentLayer;
  const selectedPage = findLayerById(selectedPageId) as ComponentLayer;
  const isLayerAPage = useLayerStore((state) =>
    state.isLayerAPage(selectedLayerId || ''),
  );
  const allowPagesCreation = useEditorStore(
    (state) => state.allowPagesCreation,
  );
  const allowPagesDeletion = useEditorStore(
    (state) => state.allowPagesDeletion,
  );
  const focusStack = useEditorStore((state) => state.focusStack);
  const setFocusStack = useEditorStore((state) => state.setFocusStack);
  const resetFocusInStore = useEditorStore((state) => state.resetFocus);
  const [commandOpen, setCommandOpen] = useState(false);

  const resolvedFocusStack = useMemo(
    () => sanitizeFocusStack(selectedPage, focusStack),
    [focusStack, selectedPage],
  );

  const focusRootId = useMemo(() => {
    if (!focusModeEnabled || !selectedPage) return null;
    return resolvedFocusStack.at(-1) ?? selectedPage.id;
  }, [focusModeEnabled, resolvedFocusStack, selectedPage]);
  const focusRootLayer =
    focusRootId != null ? (findLayerById(focusRootId) as ComponentLayer) : null;
  const effectiveRootLayer = focusRootLayer ?? selectedPage;

  const canFocusSelected =
    focusModeEnabled &&
    Boolean(selectedLayerId) &&
    selectedLayerId !== selectedPageId &&
    isLayerInsideSubtree(selectedPage, selectedLayerId);
  const canExitFocus = focusModeEnabled && resolvedFocusStack.length > 0;
  const canResetFocus = canExitFocus;

  const focusPath = useMemo(
    () => findLayerPath(selectedPage, effectiveRootLayer?.id ?? null),
    [selectedPage, effectiveRootLayer?.id],
  );

  const handleFocusLayer = useCallback(
    (layerId: string | null) => {
      if (!focusModeEnabled || !layerId || !selectedPage) return;
      if (layerId === selectedPage.id) {
        resetFocusInStore();
        return;
      }
      const nextPath = findLayerPath(selectedPage, layerId);
      if (nextPath.length <= 1) return;
      setFocusStack(nextPath.slice(1).map((layer) => layer.id));
    },
    [focusModeEnabled, resetFocusInStore, selectedPage, setFocusStack],
  );

  const handleFocusSelected = useCallback(() => {
    if (!canFocusSelected || !selectedLayerId) return;
    handleFocusLayer(selectedLayerId);
  }, [canFocusSelected, selectedLayerId, handleFocusLayer]);

  const handleExitFocus = useCallback(() => {
    if (!canExitFocus) return;
    setFocusStack(resolvedFocusStack.slice(0, -1));
  }, [canExitFocus, resolvedFocusStack, setFocusStack]);

  const handleResetFocus = useCallback(() => {
    if (!canResetFocus) return;
    resetFocusInStore();
  }, [canResetFocus, resetFocusInStore]);

  useShortcutAction(
    UI_BUILDER_FOCUS_SHORTCUTS.openCommandPalette,
    () => setCommandOpen((current) => !current),
    { enabled: focusModeEnabled },
  );

  useShortcutAction(
    UI_BUILDER_FOCUS_SHORTCUTS.focusSelected,
    () => {
      handleFocusSelected();
    },
    {
      enabled: canFocusSelected,
    },
  );

  useShortcutAction(
    UI_BUILDER_FOCUS_SHORTCUTS.exitFocus,
    () => {
      handleExitFocus();
    },
    {
      enabled: canExitFocus,
    },
  );

  useShortcutAction(
    UI_BUILDER_FOCUS_SHORTCUTS.resetFocus,
    () => {
      handleResetFocus();
    },
    {
      enabled: canResetFocus,
    },
  );

  const onSelectElement = useCallback(
    (layerId: string) => {
      if (
        !focusModeEnabled ||
        isLayerInsideSubtree(effectiveRootLayer, layerId)
      ) {
        selectLayer(layerId);
      }
    },
    [focusModeEnabled, effectiveRootLayer, selectLayer],
  );

  const handleDeleteLayer = useCallback(() => {
    if (selectedLayer && !isLayerAPage) {
      removeLayer(selectedLayer.id);
    }
  }, [selectedLayer, removeLayer, isLayerAPage]);

  const handleDuplicateLayer = useCallback(() => {
    if (selectedLayer && !isLayerAPage) {
      duplicateLayer(selectedLayer.id);
    }
  }, [selectedLayer, duplicateLayer, isLayerAPage]);

  return (
    <DndContextProvider>
      <EditorPanelContent
        className={className}
        selectedLayerId={selectedLayerId}
        selectedPageId={selectedPageId}
        selectedLayer={selectedLayer}
        selectedPage={selectedPage}
        effectiveRootLayer={effectiveRootLayer}
        focusPath={focusPath}
        isLayerAPage={isLayerAPage}
        allowPagesCreation={allowPagesCreation}
        allowPagesDeletion={allowPagesDeletion}
        previewMode={previewMode}
        componentRegistry={componentRegistry}
        autoZoomToSelected={false}
        onSelectElement={onSelectElement}
        handleDeleteLayer={handleDeleteLayer}
        handleDuplicateLayer={handleDuplicateLayer}
        onFocusLayer={handleFocusLayer}
        handleFocusSelected={handleFocusSelected}
        canFocusSelected={canFocusSelected}
        handleExitFocus={handleExitFocus}
        canExitFocus={canExitFocus}
        handleResetFocus={handleResetFocus}
        canResetFocus={canResetFocus}
        commandOpen={commandOpen}
        onCommandOpenChange={setCommandOpen}
        isAuthenticated={isAuthenticated}
        hasByoAiCredential={hasByoAiCredential}
        isByoAiLoading={isByoAiLoading}
      />
    </DndContextProvider>
  );
};

export default EditorPanel;

interface EditorPanelContentProps {
  className?: string;
  selectedLayerId: string | null;
  selectedPageId: string;
  selectedLayer: ComponentLayer;
  selectedPage: ComponentLayer;
  effectiveRootLayer: ComponentLayer;
  focusPath: ComponentLayer[];
  isLayerAPage: boolean;
  allowPagesCreation: boolean;
  allowPagesDeletion: boolean;
  previewMode: string;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  componentRegistry: any;
  autoZoomToSelected?: boolean;
  onSelectElement: (layerId: string) => void;
  handleDeleteLayer: () => void;
  handleDuplicateLayer: () => void;
  onFocusLayer: (layerId: string | null) => void;
  handleFocusSelected: () => void;
  canFocusSelected: boolean;
  handleExitFocus: () => void;
  canExitFocus: boolean;
  handleResetFocus: () => void;
  canResetFocus: boolean;
  commandOpen: boolean;
  onCommandOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  hasByoAiCredential: boolean;
  isByoAiLoading: boolean;
}

// Inner component that can access ComponentDragContext
const EditorPanelContent: React.FC<EditorPanelContentProps> = ({
  className,
  selectedPageId,
  selectedLayerId,
  selectedLayer,
  selectedPage,
  effectiveRootLayer,
  focusPath,
  allowPagesCreation,
  allowPagesDeletion,
  previewMode,
  componentRegistry,
  autoZoomToSelected,
  onSelectElement,
  handleDeleteLayer,
  handleDuplicateLayer,
  onFocusLayer,
  handleFocusSelected,
  canFocusSelected,
  handleExitFocus,
  canExitFocus,
  handleResetFocus,
  canResetFocus,
  commandOpen,
  onCommandOpenChange,
  isAuthenticated,
  hasByoAiCredential,
  isByoAiLoading,
}) => {
  const { isDragging: isComponentDragging } = useComponentDragContext();
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const [resizing, setResizing] = useState(false);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>(
    {
      width: 1000,
      height: 1000,
    },
  );
  const [pointerEventsEnabled, setPointerEventsEnabled] = useState(true);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [isMutationPermissionDialogOpen, setIsMutationPermissionDialogOpen] =
    useState(false);
  const pendingMutationPermissionResolveRef = useRef<
    ((granted: boolean) => void) | null
  >(null);
  const aiPolicyStoreRef = useRef<AiPermissionPolicyStore>(
    createAiPermissionPolicyStore(),
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AI_MUTATION_POLICY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { choice?: string; updatedAt?: number };
      if (
        parsed.choice === 'allow_once' ||
        parsed.choice === 'allow_always' ||
        parsed.choice === 'deny_session'
      ) {
        aiPolicyStoreRef.current.setPolicy(
          parsed.choice,
          parsed.updatedAt ?? Date.now(),
        );
      }
    } catch {
      // Ignore malformed local policy snapshots.
    }
  }, []);

  const persistMutationPolicy = useCallback(() => {
    const policy = aiPolicyStoreRef.current.getPolicy();
    if (!policy) {
      window.localStorage.removeItem(AI_MUTATION_POLICY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      AI_MUTATION_POLICY_STORAGE_KEY,
      JSON.stringify(policy),
    );
  }, []);

  const resolveMutationPermissionDialog = useCallback((granted: boolean) => {
    const resolver = pendingMutationPermissionResolveRef.current;
    pendingMutationPermissionResolveRef.current = null;
    if (resolver) {
      resolver(granted);
    }
  }, []);

  const handleMutationPermissionSelection = useCallback(
    (selection: AiMutationPermissionOptionValue) => {
      aiPolicyStoreRef.current.setPolicy(selection, Date.now());
      persistMutationPolicy();
      setIsMutationPermissionDialogOpen(false);
      resolveMutationPermissionDialog(selection !== 'deny_session');
    },
    [persistMutationPolicy, resolveMutationPermissionDialog],
  );

  const handleMutationPermissionDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsMutationPermissionDialogOpen(open);
      if (!open && pendingMutationPermissionResolveRef.current) {
        aiPolicyStoreRef.current.setPolicy('deny_session', Date.now());
        persistMutationPolicy();
        resolveMutationPermissionDialog(false);
      }
    },
    [persistMutationPolicy, resolveMutationPermissionDialog],
  );

  const requestMutationPermission = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        pendingMutationPermissionResolveRef.current = resolve;
        setIsMutationPermissionDialogOpen(true);
      }),
    [],
  );

  const handleResizingChange = useCallback((isDragging: boolean) => {
    setResizing(isDragging);
  }, []);

  const handleSizeChange = useCallback((width: number, height: number) => {
    setFrameSize((previous) => {
      if (previous.width === width && previous.height === height) {
        return previous;
      }
      return { width, height };
    });
  }, []);

  const handlePointerEventsToggle = useCallback((enabled: boolean) => {
    setPointerEventsEnabled(enabled);
  }, []);

  const handleEmbeddedAiAction = useCallback(() => {
    const decision = evaluateAiSurfaceGate({
      actionId: 'embedded-ai.explain-selection',
      surface: 'embedded_ai',
      isAuthenticated,
      hasByoAiCredential,
      at: Date.now(),
    });
    if (!decision.allowed) {
      toast.error(decision.message);
      return;
    }

    const query = encodeURIComponent(
      `Explain the selected layer "${selectedLayer?.name ?? selectedLayerId ?? 'unknown'}" and suggest safe improvements.`,
    );
    window.open(
      `/_business/chat?prompt=${query}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [
    hasByoAiCredential,
    isAuthenticated,
    selectedLayer?.name,
    selectedLayerId,
  ]);

  const handleApplyGeneratedLayoutAction = useCallback(async () => {
    if (!selectedLayer) {
      toast.error('Select a layer before applying an AI layout draft.');
      return;
    }

    const evaluateMutation = () =>
      evaluateAiSurfaceGate({
        actionId: 'embedded-ai.apply-generated-layout',
        surface: 'embedded_ai',
        isAuthenticated,
        hasByoAiCredential,
        at: Date.now(),
        policyStore: aiPolicyStoreRef.current,
      });

    let decision = evaluateMutation();
    if (!decision.allowed && decision.reason === 'mutation_policy_required') {
      const granted = await requestMutationPermission();
      if (!granted) {
        toast.error('AI mutation permission was not granted.');
        return;
      }
      decision = evaluateMutation();
    }

    if (!decision.allowed) {
      toast.error(decision.message);
      return;
    }

    const currentClassName =
      typeof selectedLayer.props?.className === 'string'
        ? selectedLayer.props.className
        : '';
    const nextClassName = appendClassTokens(currentClassName, [
      'ring-1',
      'ring-primary/40',
      'ring-offset-1',
    ]);

    updateLayer(selectedLayer.id, {
      className: nextClassName,
      dataAiLayoutRevision: new Date().toISOString(),
      dataAiLayoutSource: 'embedded-ai.apply-generated-layout',
    });
    persistMutationPolicy();

    toast.success('Applied AI layout draft to selected layer.');
  }, [
    hasByoAiCredential,
    isAuthenticated,
    persistMutationPolicy,
    requestMutationPermission,
    selectedLayer,
    updateLayer,
  ]);

  const totalLayers = useMemo(() => {
    if (!effectiveRootLayer) {
      return countLayers(defaultLayers);
    }
    return countLayers([effectiveRootLayer]);
  }, [effectiveRootLayer]);

  const selectedLayerForEditorConfig = useMemo(() => {
    if (isLayerInsideSubtree(effectiveRootLayer, selectedLayer?.id ?? null)) {
      return selectedLayer;
    }
    return effectiveRootLayer;
  }, [effectiveRootLayer, selectedLayer]);

  const editorConfig = useMemo(
    () => ({
      zIndex: 1,
      totalLayers,
      selectedLayer: selectedLayerForEditorConfig,
      onSelectElement,
      handleDuplicateLayer: allowPagesCreation
        ? handleDuplicateLayer
        : undefined,
      handleDeleteLayer: allowPagesDeletion ? handleDeleteLayer : undefined,
    }),
    [
      totalLayers,
      selectedLayerForEditorConfig,
      onSelectElement,
      handleDuplicateLayer,
      handleDeleteLayer,
      allowPagesCreation,
      allowPagesDeletion,
    ],
  );

  const widthClass = useMemo(() => {
    if (previewMode === 'responsive') {
      return 'w-full';
    } else if (previewMode === 'mobile') {
      return 'w-[390px]';
    } else if (previewMode === 'tablet') {
      return 'w-[768px]';
    } else if (previewMode === 'desktop') {
      return 'w-[1440px]';
    } else {
      return 'w-full';
    }
  }, [previewMode]);

  const heightClass = useMemo(() => {
    if (previewMode === 'responsive') {
      return '';
    } else if (previewMode === 'mobile') {
      // iPhone 13 / 14 viewport: 390x844
      return 'h-[844px]';
    } else if (previewMode === 'tablet') {
      // iPad portrait viewport: 768x1024
      return 'h-[1024px]';
    } else if (previewMode === 'desktop') {
      // MacBook Air 13" viewport: 1440x900
      return 'h-[900px]';
    } else {
      return 'h-full';
    }
  }, [previewMode]);

  // Memoize ResizableWrapper props
  const resizableProps = useMemo(
    () => ({
      isResizable: previewMode === 'responsive',
      onDraggingChange: handleResizingChange,
      onSizeChange: handleSizeChange,
    }),
    [previewMode, handleResizingChange, handleSizeChange],
  );

  // Memoize AutoFrame props
  const autoFrameProps = useMemo(
    () => ({
      height: frameSize.height,
      className: cn('shadow-lg', widthClass, heightClass),
      pointerEventsEnabled,
    }),
    [frameSize.height, widthClass, heightClass, pointerEventsEnabled],
  );

  // Memoize LayerRenderer props
  const layerRendererProps = useMemo(
    () => ({
      className: 'contents',
      page: effectiveRootLayer,
      editorConfig,
      componentRegistry,
    }),
    [effectiveRootLayer, editorConfig, componentRegistry],
  );

  const renderer = useMemo(
    () => (
      <ResizableWrapper {...resizableProps}>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <div
          id="editor-panel-content"
          className={cn('overflow-visible ', widthClass)}
          data-focus-root-id={effectiveRootLayer?.id}
        >
          <AutoFrame {...autoFrameProps} ref={frameRef}>
            <LayerRenderer {...layerRendererProps} />
          </AutoFrame>
        </div>
      </ResizableWrapper>
    ),
    [
      resizableProps,
      widthClass,
      effectiveRootLayer?.id,
      autoFrameProps,
      layerRendererProps,
    ],
  );

  // Use static objects for consistent styles
  const wrapperStyle = WRAPPER_STYLE;
  const contentStyle = CONTENT_STYLE;
  const transformDivStyle = TRANSFORM_DIV_STYLE;
  const wheelConfig = WHEEL_CONFIG;
  const doubleClickConfig = DOUBLE_CLICK_CONFIG;

  // Disable panning when either resizing the viewport OR dragging components
  const panningConfig = useMemo(
    () => ({
      disabled: resizing || isComponentDragging,
    }),
    [resizing, isComponentDragging],
  );

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup
    <div
      id="editor-panel-container"
      className={cn(
        'flex flex-col relative size-full bg-fixed bg-[radial-gradient(hsl(var(--border))_1px,hsl(var(--primary)/0.05)_1px)] [background-size:16px_16px] will-change-auto',
        className,
      )}
    >
      <div className="absolute left-4 top-4 z-[1000] max-w-[70%] rounded-full border bg-background/90 px-3 py-1 backdrop-blur-sm">
        <FocusBreadcrumbs
          path={focusPath}
          selectedPage={selectedPage}
          onFocusLayer={onFocusLayer}
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute right-4 top-4 z-[1000] gap-2"
        onClick={() => onCommandOpenChange(true)}
      >
        <CommandIcon className="size-4" />
        Focus Actions
      </Button>

      <TransformWrapper
        initialScale={0.8}
        initialPositionX={-30}
        initialPositionY={-30}
        minScale={0.1}
        maxScale={5}
        wheel={wheelConfig}
        doubleClick={doubleClickConfig}
        panning={panningConfig}
        centerOnInit={false}
        limitToBounds={false}
      >
        <ZoomControls
          onPointerEventsToggle={handlePointerEventsToggle}
          pointerEventsEnabled={pointerEventsEnabled}
          onFocusSelected={handleFocusSelected}
          canFocusSelected={canFocusSelected}
          onExitFocus={handleExitFocus}
          canExitFocus={canExitFocus}
        />
        {autoZoomToSelected && (
          <AutoZoomToSelected
            selectedLayerId={selectedLayerId}
            autoZoomToSelected={autoZoomToSelected}
          />
        )}
        <TransformComponent
          wrapperStyle={wrapperStyle}
          contentStyle={contentStyle}
        >
          <div
            className={cn('relative', widthClass)}
            data-testid="transform-component"
            style={transformDivStyle}
          >
            {renderer}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <AddComponentsPopover
        parentLayerId={effectiveRootLayer?.id ?? selectedPageId}
      >
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-4 left-4 size-14 md:size-10 flex items-center rounded-full bg-secondary shadow-lg z-[1000] [&_svg]:size-7 [&_svg]:md:size-4"
          data-testid="button-AddComponent"
        >
          <Plus className="text-secondary-foreground" />
        </Button>
      </AddComponentsPopover>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isByoAiLoading}
        onClick={handleEmbeddedAiAction}
        className="absolute bottom-4 left-20 z-[1000] rounded-full"
      >
        <Sparkles className="size-4" />
        Ask AI
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isByoAiLoading || !selectedLayer}
        onClick={() => {
          void handleApplyGeneratedLayoutAction();
        }}
        className="absolute bottom-4 left-44 z-[1000] rounded-full"
      >
        <Sparkles className="size-4" />
        Apply AI Draft
      </Button>

      <FocusModeCommandPalette
        open={commandOpen}
        onOpenChange={onCommandOpenChange}
        canFocusSelected={canFocusSelected}
        canExitFocus={canExitFocus}
        canResetFocus={canResetFocus}
        onFocusSelected={handleFocusSelected}
        onExitFocus={handleExitFocus}
        onResetFocus={handleResetFocus}
      />
      <AiMutationPermissionDialog
        open={isMutationPermissionDialogOpen}
        onOpenChange={handleMutationPermissionDialogOpenChange}
        onSelect={handleMutationPermissionSelection}
      />
    </div>
  );
};

function FocusBreadcrumbs({
  path,
  selectedPage,
  onFocusLayer,
}: {
  path: ComponentLayer[];
  selectedPage: ComponentLayer;
  onFocusLayer: (layerId: string | null) => void;
}) {
  const entries = path.length > 0 ? path : selectedPage ? [selectedPage] : [];

  return (
    <div
      className="flex items-center gap-1 text-xs md:text-sm"
      data-testid="focus-breadcrumbs"
    >
      {entries.map((layer, index) => {
        const isPage = index === 0;
        const isLast = index === entries.length - 1;
        return (
          <div key={layer.id} className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                'rounded px-1.5 py-0.5 transition-colors',
                isLast
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              onClick={() => {
                if (isPage) {
                  onFocusLayer(selectedPage.id);
                  return;
                }
                onFocusLayer(layer.id);
              }}
            >
              {layer.name || layer.type}
            </button>
            {!isLast ? <span className="text-muted-foreground">/</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function FocusModeCommandPalette({
  open,
  onOpenChange,
  canFocusSelected,
  canExitFocus,
  canResetFocus,
  onFocusSelected,
  onExitFocus,
  onResetFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canFocusSelected: boolean;
  canExitFocus: boolean;
  canResetFocus: boolean;
  onFocusSelected: () => void;
  onExitFocus: () => void;
  onResetFocus: () => void;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Focus Mode Actions"
      description="Use keyboard or command actions to navigate focused editing mode."
    >
      <CommandInput placeholder="Search focus actions..." />
      <CommandList>
        <CommandEmpty>No focus actions found.</CommandEmpty>
        <CommandGroup heading="Focus Mode">
          <CommandItem
            value="Focus selected component"
            disabled={!canFocusSelected}
            onSelect={() => {
              onOpenChange(false);
              onFocusSelected();
            }}
          >
            Focus selected component
            <span className="ml-auto text-xs text-muted-foreground">
              <ShortcutKbd
                actionId={UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.id}
                defaultBinding={
                  UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.defaultBinding
                }
                interactive={false}
              />
            </span>
          </CommandItem>
          <CommandItem
            value="Zoom out one level"
            disabled={!canExitFocus}
            onSelect={() => {
              onOpenChange(false);
              onExitFocus();
            }}
          >
            Zoom out one level
            <span className="ml-auto text-xs text-muted-foreground">
              <ShortcutKbd
                actionId={UI_BUILDER_FOCUS_SHORTCUTS.exitFocus.id}
                defaultBinding={
                  UI_BUILDER_FOCUS_SHORTCUTS.exitFocus.defaultBinding
                }
                interactive={false}
              />
            </span>
          </CommandItem>
          <CommandItem
            value="Reset focus mode"
            disabled={!canResetFocus}
            onSelect={() => {
              onOpenChange(false);
              onResetFocus();
            }}
          >
            Reset focus mode
            <span className="ml-auto text-xs text-muted-foreground">
              <ShortcutKbd
                actionId={UI_BUILDER_FOCUS_SHORTCUTS.resetFocus.id}
                defaultBinding={
                  UI_BUILDER_FOCUS_SHORTCUTS.resetFocus.defaultBinding
                }
                interactive={false}
              />
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/* istanbul ignore next */

// Auto-zoom to selected element component
const AutoZoomToSelected: React.FC<{
  selectedLayerId: string | null;
  autoZoomToSelected: boolean;
}> = ({ selectedLayerId, autoZoomToSelected }) => {
  const { zoomToElement } = useControls();
  const previousSelectedLayerIdRef = useRef<string | null>(null);

  // Zoom to selected element when selection changes
  useEffect(() => {
    if (!selectedLayerId || !zoomToElement || !autoZoomToSelected) return;

    // Only zoom if the selected element is different from the previous one
    if (previousSelectedLayerIdRef.current === selectedLayerId) return;

    // Update the previous selected layer ID
    previousSelectedLayerIdRef.current = selectedLayerId;

    // Small delay to ensure DOM is updated after selection change
    const timeoutId = setTimeout(() => {
      // Try to find the selected element by data attribute or ID
      const selectedElement =
        document.querySelector(`[data-layer-id="${selectedLayerId}"]`) ||
        document.getElementById(`layer-${selectedLayerId}`);

      if (selectedElement) {
        zoomToElement(selectedElement as HTMLElement, undefined, 300);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedLayerId, zoomToElement, autoZoomToSelected]);

  return null;
};
