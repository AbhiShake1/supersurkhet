import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ShortcutActionId = string;

export type ShortcutBinding = {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
};

export type ShortcutScope = string;

export type ShortcutDefinition = {
  id: ShortcutActionId;
  label: string;
  description?: string;
  scope?: ShortcutScope;
  defaultBinding: ShortcutBinding;
};

const STORAGE_KEY = 'auto-admin-shortcuts-v3';

type ShortcutContextValue = {
  bindings: Record<ShortcutActionId, ShortcutBinding>;
  registry: Record<ShortcutActionId, ShortcutDefinition>;
  openDialog: (actionId?: ShortcutActionId) => void;
  closeDialog: () => void;
  dialogState: {
    open: boolean;
    selectedActionId?: ShortcutActionId;
  };
  setBinding: (actionId: ShortcutActionId, binding: ShortcutBinding) => void;
  resetBinding: (actionId: ShortcutActionId) => void;
  resetAllBindings: () => void;
  registerShortcut: (definition: ShortcutDefinition) => void;
};

const ShortcutContext = React.createContext<ShortcutContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  const role = target.getAttribute('role');
  return role === 'textbox' || role === 'searchbox' || role === 'combobox';
}

function isEditableContext(event: KeyboardEvent): boolean {
  if (isEditableTarget(event.target)) return true;
  if (typeof document === 'undefined') return false;
  return isEditableTarget(document.activeElement);
}

function normalizeKey(raw: string): string {
  if (raw === 'Spacebar') return ' ';
  if (raw === 'Esc') return 'Escape';
  return raw.length === 1 ? raw.toLowerCase() : raw;
}

function isBindingMatch(
  event: KeyboardEvent,
  binding: ShortcutBinding,
): boolean {
  const normalizedEventKey = normalizeKey(event.key);
  const normalizedBindingKey = normalizeKey(binding.key);
  return (
    normalizedEventKey === normalizedBindingKey &&
    event.ctrlKey === binding.ctrl &&
    event.metaKey === binding.meta &&
    event.altKey === binding.alt &&
    event.shiftKey === binding.shift
  );
}

function displayBinding(binding: ShortcutBinding): string[] {
  const keys: string[] = [];
  if (binding.meta) keys.push(getMetaKeyLabel());
  if (binding.ctrl) keys.push('Ctrl');
  if (binding.alt) keys.push('Alt');
  if (binding.shift) keys.push('Shift');
  if (binding.key === ' ') {
    keys.push('Space');
  } else if (binding.key.length === 1) {
    keys.push(binding.key.toUpperCase());
  } else {
    keys.push(binding.key);
  }
  return keys;
}

function getMetaKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Meta';
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.platform;
  if (/mac|iphone|ipad|ipod/i.test(platform)) return 'Cmd';
  if (/win/i.test(platform)) return 'Win';
  return 'Meta';
}

function loadStoredBindings(): Record<ShortcutActionId, ShortcutBinding> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<ShortcutActionId, ShortcutBinding>;
  } catch {
    return {};
  }
}

function persistBindings(bindings: Record<ShortcutActionId, ShortcutBinding>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

function getShortcutSignature(definition: ShortcutDefinition): string {
  return JSON.stringify({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    scope: definition.scope,
    defaultBinding: definition.defaultBinding,
  });
}

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bindings, setBindings] = React.useState<
    Record<ShortcutActionId, ShortcutBinding>
  >(() => loadStoredBindings());
  const [registry, setRegistry] = React.useState<
    Record<ShortcutActionId, ShortcutDefinition>
  >({});
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    selectedActionId?: ShortcutActionId;
  }>({ open: false });

  const updateBindings = React.useCallback(
    (
      update: (
        current: Record<ShortcutActionId, ShortcutBinding>,
      ) => Record<ShortcutActionId, ShortcutBinding>,
    ) => {
      setBindings((current) => {
        const next = update(current);
        if (next !== current) persistBindings(next);
        return next;
      });
    },
    [],
  );

  const registerShortcut = React.useCallback(
    (definition: ShortcutDefinition) => {
      setRegistry((current) => {
        const existing = current[definition.id];
        if (
          existing &&
          existing.label === definition.label &&
          existing.description === definition.description &&
          existing.scope === definition.scope &&
          existing.defaultBinding.key === definition.defaultBinding.key &&
          existing.defaultBinding.ctrl === definition.defaultBinding.ctrl &&
          existing.defaultBinding.meta === definition.defaultBinding.meta &&
          existing.defaultBinding.alt === definition.defaultBinding.alt &&
          existing.defaultBinding.shift === definition.defaultBinding.shift
        ) {
          return current;
        }
        return {
          ...current,
          [definition.id]: definition,
        };
      });
    },
    [],
  );

  const setBinding = React.useCallback(
    (actionId: ShortcutActionId, binding: ShortcutBinding) => {
      updateBindings((current) => ({ ...current, [actionId]: binding }));
    },
    [updateBindings],
  );

  const resetBinding = React.useCallback(
    (actionId: ShortcutActionId) => {
      const definition = registry[actionId];
      if (!definition) return;
      updateBindings((current) => ({
        ...current,
        [actionId]: definition.defaultBinding,
      }));
    },
    [registry, updateBindings],
  );

  const resetAllBindings = React.useCallback(() => {
    updateBindings((current) => {
      const next = { ...current };
      for (const definition of Object.values(registry)) {
        next[definition.id] = definition.defaultBinding;
      }
      return next;
    });
  }, [registry, updateBindings]);

  const openDialog = React.useCallback((actionId?: ShortcutActionId) => {
    setDialogState({ open: true, selectedActionId: actionId });
  }, []);

  const closeDialog = React.useCallback(() => {
    setDialogState({ open: false, selectedActionId: undefined });
  }, []);

  const value = React.useMemo<ShortcutContextValue>(
    () => ({
      bindings,
      registry,
      openDialog,
      closeDialog,
      dialogState,
      setBinding,
      resetBinding,
      resetAllBindings,
      registerShortcut,
    }),
    [
      bindings,
      closeDialog,
      dialogState,
      openDialog,
      registerShortcut,
      registry,
      resetAllBindings,
      resetBinding,
      setBinding,
    ],
  );

  return (
    <ShortcutContext.Provider value={value}>
      {children}
      <KeyboardShortcutSettingsDialog />
    </ShortcutContext.Provider>
  );
}

export function KeyboardShortcutsBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const existing = React.useContext(ShortcutContext);
  if (existing) return <>{children}</>;
  return <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>;
}

export function useRegisterShortcut(definition?: ShortcutDefinition) {
  const context = React.useContext(ShortcutContext);
  const signature = React.useMemo(
    () => (definition ? getShortcutSignature(definition) : null),
    [definition],
  );
  const lastRegisteredSignatureRef = React.useRef<string | null>(null);

  React.useLayoutEffect(() => {
    if (!context || !definition) return;
    if (lastRegisteredSignatureRef.current === signature) return;
    context.registerShortcut(definition);
    lastRegisteredSignatureRef.current = signature;
  }, [context, definition, signature]);
}

export function useShortcutBinding(
  actionId: ShortcutActionId,
  defaultBinding?: ShortcutBinding,
): ShortcutBinding {
  const context = React.useContext(ShortcutContext);
  if (!context) {
    return (
      defaultBinding ?? {
        key: '?',
        ctrl: false,
        meta: false,
        alt: false,
        shift: false,
      }
    );
  }
  return (
    context.bindings[actionId] ??
    defaultBinding ??
    context.registry[actionId]?.defaultBinding ?? {
      key: '?',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    }
  );
}

export function useShortcutAction(
  definition: ShortcutDefinition,
  handler: (event: KeyboardEvent) => void,
  options?: {
    enabled?: boolean;
    guard?: (event: KeyboardEvent) => boolean;
    allowInEditableContext?: boolean;
  },
) {
  const enabled = options?.enabled ?? true;
  const guard = options?.guard;
  const allowInEditableContext = options?.allowInEditableContext ?? false;
  const binding = useShortcutBinding(definition.id, definition.defaultBinding);

  useRegisterShortcut(definition);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (!isBindingMatch(event, binding)) return;
      if (guard && !guard(event)) return;
      if (!allowInEditableContext && isEditableContext(event)) return;
      event.preventDefault();
      handler(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allowInEditableContext, binding, enabled, guard, handler]);
}

const OPEN_SIDEBAR_LEGEND_SHORTCUT: ShortcutDefinition = {
  id: 'autoAdmin.openSidebar',
  label: 'Open sidebar',
  scope: 'AutoAdmin Sidebar',
  defaultBinding: {
    key: '1',
    ctrl: false,
    meta: true,
    alt: false,
    shift: true,
  },
};

type ShortcutKbdInteraction = 'trigger-parent' | 'open-settings';

function ShortcutKeyGroup({
  actionId,
  binding,
}: {
  actionId: ShortcutActionId;
  binding: ShortcutBinding;
}) {
  const parts = displayBinding(binding);
  return (
    <ButtonGroup className="pointer-events-none">
      <ButtonGroupText
        className="h-6 gap-1 rounded-md border-border/60 bg-muted/80 px-2 text-xs font-medium shadow-none"
        aria-hidden="true"
      >
        {parts.map((part, index) => (
          <React.Fragment key={`${actionId}-${part}`}>
            {index > 0 ? (
              <span className="px-0.5 text-muted-foreground/80">+</span>
            ) : null}
            <span className="leading-none">{part}</span>
          </React.Fragment>
        ))}
      </ButtonGroupText>
    </ButtonGroup>
  );
}

export function ShortcutKbd({
  actionId,
  className,
  defaultBinding,
  interaction = 'trigger-parent',
  interactive = true,
}: {
  actionId: ShortcutActionId;
  className?: string;
  defaultBinding?: ShortcutBinding;
  interaction?: ShortcutKbdInteraction;
  interactive?: boolean;
}) {
  const context = React.useContext(ShortcutContext);
  const binding = useShortcutBinding(actionId, defaultBinding);

  const triggerParentAction = React.useCallback((target: HTMLElement) => {
    let parent = target.parentElement;
    while (parent) {
      const isInteractive =
        parent instanceof HTMLButtonElement ||
        parent instanceof HTMLAnchorElement ||
        parent.getAttribute('role') === 'button' ||
        parent.getAttribute('role') === 'menuitem';
      if (isInteractive) {
        parent.click();
        break;
      }
      parent = parent.parentElement;
    }
  }, []);

  const onActivate = React.useCallback(
    (target: HTMLElement) => {
      if (interaction === 'open-settings') {
        context?.openDialog(actionId);
        return;
      }
      triggerParentAction(target);
    },
    [actionId, context, interaction, triggerParentAction],
  );

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onActivate(event.currentTarget);
    },
    [onActivate],
  );

  if (!interactive) {
    return (
      <span className={className} aria-hidden="true">
        <ShortcutKeyGroup actionId={actionId} binding={binding} />
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        onActivate(event.currentTarget);
      }}
      aria-label={
        interaction === 'open-settings'
          ? `Configure shortcut for ${actionId}`
          : `${actionId} shortcut`
      }
    >
      <ShortcutKeyGroup actionId={actionId} binding={binding} />
    </button>
  );
}

function ShortcutRecorder({
  actionId,
  binding,
  onChange,
}: {
  actionId: ShortcutActionId;
  binding: ShortcutBinding;
  onChange: (binding: ShortcutBinding) => void;
}) {
  const [recording, setRecording] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="justify-start gap-2"
      onClick={() => setRecording(true)}
      onKeyDown={(event) => {
        if (!recording) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Escape') {
          setRecording(false);
          return;
        }
        const nextBinding: ShortcutBinding = {
          key: normalizeKey(event.key),
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          alt: event.altKey,
          shift: event.shiftKey,
        };
        onChange(nextBinding);
        setRecording(false);
      }}
      aria-label={`Record shortcut for ${actionId}`}
    >
      {recording ? (
        <span className="text-xs text-muted-foreground">Press keys...</span>
      ) : (
        <KbdGroup>
          {displayBinding(binding).map((part) => (
            <Kbd key={`${actionId}-display-${part}`}>{part}</Kbd>
          ))}
        </KbdGroup>
      )}
    </Button>
  );
}

function KeyboardShortcutSettingsDialog() {
  const context = React.useContext(ShortcutContext);
  const actionsByScope = React.useMemo(() => {
    const map = new Map<string, ShortcutDefinition[]>();
    for (const definition of Object.values(context?.registry ?? {})) {
      const key = definition.scope ?? 'General';
      const current = map.get(key) ?? [];
      current.push(definition);
      map.set(key, current);
    }
    return [...map.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [context?.registry]);

  if (!context) return null;

  const {
    dialogState,
    closeDialog,
    bindings,
    setBinding,
    resetBinding,
    resetAllBindings,
  } = context;

  return (
    <Dialog
      open={dialogState.open}
      onOpenChange={(open) => !open && closeDialog()}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Click a shortcut and press a new key combination. Preferences are
            saved in local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end">
          <Button type="button" variant="ghost" onClick={resetAllBindings}>
            Reset all
          </Button>
        </div>
        <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
          {actionsByScope.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shortcuts registered yet.
            </p>
          ) : (
            actionsByScope.map(([scope, actions]) => (
              <ShortcutSection
                key={scope}
                title={scope}
                actions={actions}
                selectedActionId={dialogState.selectedActionId}
                bindings={bindings}
                setBinding={setBinding}
                resetBinding={resetBinding}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutSection({
  title,
  actions,
  selectedActionId,
  bindings,
  setBinding,
  resetBinding,
}: {
  title: string;
  actions: ShortcutDefinition[];
  selectedActionId?: ShortcutActionId;
  bindings: Record<ShortcutActionId, ShortcutBinding>;
  setBinding: (actionId: ShortcutActionId, binding: ShortcutBinding) => void;
  resetBinding: (actionId: ShortcutActionId) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto] ${
              selectedActionId === action.id
                ? 'border-primary/60 bg-primary/5'
                : ''
            }`}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{action.label}</p>
              {action.description ? (
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              ) : null}
            </div>
            <ShortcutRecorder
              actionId={action.id}
              binding={bindings[action.id] ?? action.defaultBinding}
              onChange={(binding) => setBinding(action.id, binding)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => resetBinding(action.id)}
            >
              Reset
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function KeyboardShortcutLegend() {
  const context = React.useContext(ShortcutContext);
  useRegisterShortcut(OPEN_SIDEBAR_LEGEND_SHORTCUT);

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => context?.openDialog()}
          >
            Shortcuts
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>Open sidebar</span>
          <ShortcutKbd
            actionId={OPEN_SIDEBAR_LEGEND_SHORTCUT.id}
            defaultBinding={OPEN_SIDEBAR_LEGEND_SHORTCUT.defaultBinding}
            interaction="open-settings"
            interactive={false}
          />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
