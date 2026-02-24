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
  setBinding: (
    actionId: ShortcutActionId,
    binding: ShortcutBinding,
  ) => {
    updated: boolean;
    replacedActionId?: ShortcutActionId;
  };
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

function isModifierOnlyKey(key: string): boolean {
  return (
    key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta'
  );
}

function isSameBinding(left: ShortcutBinding, right: ShortcutBinding): boolean {
  return (
    normalizeKey(left.key) === normalizeKey(right.key) &&
    left.ctrl === right.ctrl &&
    left.meta === right.meta &&
    left.alt === right.alt &&
    left.shift === right.shift
  );
}

function isEmptyBinding(binding: ShortcutBinding): boolean {
  return (
    binding.key.trim().length === 0 &&
    !binding.ctrl &&
    !binding.meta &&
    !binding.alt &&
    !binding.shift
  );
}

function displayBinding(binding: ShortcutBinding): string[] {
  if (isEmptyBinding(binding)) return [];
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

function sanitizeInternalShortcutText(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/auto[-\s]*admin\s+sidebar/gi, 'Sidebar')
    .replace(/data\s*table/gi, 'Table')
    .replace(/auto\s*table/gi, 'Table')
    .replace(/auto[-\s]*admin/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

function toUserFacingShortcutScope(scope: string | undefined): string {
  if (!scope) return 'General';
  const normalized = sanitizeInternalShortcutText(scope).trim();
  if (!normalized) return 'General';
  if (/^table$/i.test(normalized)) return 'Table';
  if (/^sidebar$/i.test(normalized)) return 'Sidebar';
  return normalized;
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
      let replacedActionId: ShortcutActionId | undefined;
      let updated = false;
      updateBindings((current) => {
        const currentForAction =
          current[actionId] ?? registry[actionId]?.defaultBinding;
        if (currentForAction && isSameBinding(currentForAction, binding)) {
          return current;
        }

        const next = { ...current };
        for (const [registeredActionId, definition] of Object.entries(
          registry,
        )) {
          if (registeredActionId === actionId) continue;
          const effective =
            current[registeredActionId] ?? definition.defaultBinding;
          if (isSameBinding(effective, binding)) {
            next[registeredActionId] = definition.defaultBinding;
            replacedActionId = registeredActionId;
          }
        }
        next[actionId] = binding;
        updated = true;
        return next;
      });
      return { updated, replacedActionId };
    },
    [registry, updateBindings],
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

function triggerBinding(binding: ShortcutBinding) {
  if (typeof window === 'undefined') return;
  const dispatch = () => {
    const event = new KeyboardEvent('keydown', {
      key: binding.key,
      ctrlKey: binding.ctrl,
      metaKey: binding.meta,
      altKey: binding.alt,
      shiftKey: binding.shift,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.isContentEditable ||
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement)
  ) {
    active.blur();
    window.requestAnimationFrame(dispatch);
    return;
  }
  dispatch();
}

export function useShortcutRegistry() {
  const context = React.useContext(ShortcutContext);

  const shortcuts = React.useMemo(
    () =>
      Object.values(context?.registry ?? {})
        .map((definition) => {
          const binding =
            context?.bindings[definition.id] ?? definition.defaultBinding;
          return {
            id: definition.id,
            label:
              sanitizeInternalShortcutText(definition.label) ||
              definition.label,
            description: sanitizeInternalShortcutText(definition.description),
            scope: toUserFacingShortcutScope(definition.scope),
            binding,
            bindingLabel: displayBinding(binding).join(' + '),
          };
        })
        .sort((left, right) => {
          const scopeCompare = left.scope.localeCompare(right.scope);
          if (scopeCompare !== 0) return scopeCompare;
          return left.label.localeCompare(right.label);
        }),
    [context?.bindings, context?.registry],
  );

  const openShortcutDialog = React.useCallback(
    (actionId: ShortcutActionId) => {
      context?.openDialog(actionId);
    },
    [context],
  );

  const executeShortcut = React.useCallback(
    (actionId: ShortcutActionId) => {
      const definition = context?.registry[actionId];
      if (!definition) return false;
      const binding = context.bindings[actionId] ?? definition.defaultBinding;
      triggerBinding(binding);
      return true;
    },
    [context],
  );

  return {
    shortcuts,
    openShortcutDialog,
    executeShortcut,
  };
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
      event.stopPropagation();
      event.stopImmediatePropagation();
      handler(event);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
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

const SAVE_SHORTCUT_EDITOR_SHORTCUT: ShortcutDefinition = {
  id: 'shortcutEditor.save',
  label: 'Save edited shortcut',
  scope: 'Shortcut Editor',
  defaultBinding: {
    key: 'Enter',
    ctrl: false,
    meta: true,
    alt: false,
    shift: false,
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
  interaction = 'open-settings',
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
  const canOpenSettings = interaction === 'open-settings' && Boolean(context);
  const shouldRenderButton = interactive || canOpenSettings;

  React.useLayoutEffect(() => {
    if (!context || !defaultBinding) return;
    if (context.registry[actionId]) return;
    context.registerShortcut({
      id: actionId,
      label: actionId,
      scope: 'General',
      description: `Shortcut for ${actionId}`,
      defaultBinding,
    });
  }, [actionId, context, defaultBinding]);

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
        if (context?.registry[actionId]) {
          context.openDialog(actionId);
        } else {
          context?.openDialog();
        }
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

  if (!shouldRenderButton) {
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
      title={
        interaction === 'open-settings' && !context
          ? 'Shortcut settings are unavailable here'
          : undefined
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
  onChange: (binding: ShortcutBinding) => {
    updated: boolean;
    replacedActionId?: ShortcutActionId;
  };
}) {
  const [recording, setRecording] = React.useState(false);
  const [previewBinding, setPreviewBinding] = React.useState(binding);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!recording) {
      setPreviewBinding(binding);
    }
  }, [binding, recording]);

  React.useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const normalized = normalizeKey(event.key);
      if (normalized === 'Escape' && !event.ctrlKey && !event.metaKey) {
        setRecording(false);
        setStatus(null);
        setPreviewBinding(binding);
        return;
      }

      const nextBinding: ShortcutBinding = {
        key: normalized,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        alt: event.altKey,
        shift: event.shiftKey,
      };
      setPreviewBinding(nextBinding);

      if (isModifierOnlyKey(event.key)) return;

      const result = onChange(nextBinding);
      if (!result.updated) {
        setStatus('Shortcut unchanged');
      } else if (result.replacedActionId) {
        setStatus(`Reassigned from ${result.replacedActionId}`);
      } else {
        setStatus('Shortcut updated');
      }
      setRecording(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [binding, onChange, recording]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setStatus(null);
          setRecording(true);
        }}
        className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
          recording
            ? 'border-primary/70 bg-primary/10'
            : 'border-border bg-muted/30 hover:bg-muted/50'
        }`}
        aria-label={`Record shortcut for ${actionId}`}
      >
        <div className="flex items-center justify-between gap-2">
          <ShortcutKeyGroup
            actionId={`${actionId}-recorder`}
            binding={recording ? previewBinding : binding}
          />
          <span className="text-[11px] text-muted-foreground">
            {recording ? 'Listening...' : 'Record'}
          </span>
        </div>
      </button>
      {recording ? (
        <p className="text-[11px] text-muted-foreground">
          Press modifiers + key. Press Escape to cancel.
        </p>
      ) : null}
      {!recording && status ? (
        <p className="text-[11px] text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}

function findShortcutConflict(
  actionId: ShortcutActionId,
  binding: ShortcutBinding,
  registry: Record<ShortcutActionId, ShortcutDefinition>,
  bindings: Record<ShortcutActionId, ShortcutBinding>,
): ShortcutDefinition | undefined {
  for (const definition of Object.values(registry)) {
    if (definition.id === actionId) continue;
    const existingBinding =
      bindings[definition.id] ?? definition.defaultBinding;
    if (isSameBinding(existingBinding, binding)) return definition;
  }
  return undefined;
}

function keyToLabel(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function createBindingFromKeyboardEvent(event: KeyboardEvent): ShortcutBinding {
  return {
    key: normalizeKey(event.key),
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

function createPreviewKeysFromBinding(binding: ShortcutBinding): string[] {
  const parts: string[] = [];
  if (binding.meta) parts.push(getMetaKeyLabel());
  if (binding.ctrl) parts.push('Ctrl');
  if (binding.alt) parts.push('Alt');
  if (binding.shift) parts.push('Shift');
  if (!isModifierOnlyKey(binding.key)) {
    parts.push(keyToLabel(binding.key));
  }
  return parts;
}

function ShortcutKeyPreview({ keys }: { keys: string[] }) {
  if (!keys.length) {
    return (
      <span className="text-sm text-muted-foreground">
        Press a shortcut combination
      </span>
    );
  }

  return (
    <ButtonGroup className="pointer-events-none">
      <ButtonGroupText
        className="h-7 gap-1 rounded-md border-border/60 bg-muted/80 px-2 text-xs font-medium shadow-none"
        aria-hidden="true"
      >
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 ? (
              <span className="px-0.5 text-muted-foreground/80">+</span>
            ) : null}
            <span className="leading-none">{key}</span>
          </React.Fragment>
        ))}
      </ButtonGroupText>
    </ButtonGroup>
  );
}

function SingleShortcutEditor({
  action,
  binding,
  bindings,
  registry,
  setBinding,
  resetBinding,
  closeDialog,
}: {
  action: ShortcutDefinition;
  binding: ShortcutBinding;
  bindings: Record<ShortcutActionId, ShortcutBinding>;
  registry: Record<ShortcutActionId, ShortcutDefinition>;
  setBinding: (
    actionId: ShortcutActionId,
    binding: ShortcutBinding,
  ) => {
    updated: boolean;
    replacedActionId?: ShortcutActionId;
  };
  resetBinding: (actionId: ShortcutActionId) => void;
  closeDialog: () => void;
}) {
  const captureRef = React.useRef<HTMLButtonElement | null>(null);
  const [isListening, setIsListening] = React.useState(true);
  const [candidate, setCandidate] = React.useState<ShortcutBinding | null>(
    null,
  );
  const [previewKeys, setPreviewKeys] = React.useState<string[]>([]);

  const conflictAction = React.useMemo(
    () =>
      candidate
        ? findShortcutConflict(action.id, candidate, registry, bindings)
        : undefined,
    [action.id, bindings, candidate, registry],
  );
  const conflictActionLabel = conflictAction
    ? sanitizeInternalShortcutText(conflictAction.label) || conflictAction.label
    : undefined;
  const displayKeys =
    previewKeys.length > 0
      ? previewKeys
      : candidate
        ? createPreviewKeysFromBinding(candidate)
        : [];
  const hasChange = candidate ? !isSameBinding(candidate, binding) : false;
  const canSave = Boolean(candidate) && hasChange && !conflictAction;

  const saveCandidate = React.useCallback(() => {
    if (!candidate || !canSave) return;
    setBinding(action.id, candidate);
    closeDialog();
  }, [action.id, canSave, candidate, closeDialog, setBinding]);

  useRegisterShortcut(SAVE_SHORTCUT_EDITOR_SHORTCUT);
  useShortcutAction(
    SAVE_SHORTCUT_EDITOR_SHORTCUT,
    () => {
      saveCandidate();
    },
    {
      enabled: canSave,
      allowInEditableContext: true,
      guard: () => true,
    },
  );

  React.useEffect(() => {
    if (!isListening) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      const nextBinding = createBindingFromKeyboardEvent(event);
      setPreviewKeys(createPreviewKeysFromBinding(nextBinding));
      if (isModifierOnlyKey(event.key)) return;
      setCandidate(nextBinding);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        setPreviewKeys(
          createPreviewKeysFromBinding({
            key: '',
            meta: event.metaKey,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey,
          }),
        );
        return;
      }
      setPreviewKeys([]);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [isListening]);

  React.useEffect(() => {
    captureRef.current?.focus();
  }, []);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{action.label}</p>
        {action.description ? (
          <p className="text-xs text-muted-foreground">{action.description}</p>
        ) : null}
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Current shortcut
        </div>
        <ShortcutKeyGroup actionId={`${action.id}-current`} binding={binding} />
      </div>
      <button
        ref={captureRef}
        type="button"
        className={`w-full rounded-xl border px-4 py-4 text-left transition ${
          isListening
            ? 'border-primary/60 bg-primary/5 shadow-sm'
            : 'border-border/70 bg-muted/20 hover:bg-muted/30'
        }`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsListening(true);
        }}
        onBlur={() => setIsListening(false)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">New shortcut</p>
            <p className="text-xs text-muted-foreground">
              Press keys now. This field captures shortcuts directly.
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {isListening ? 'Listening' : 'Click to listen'}
          </span>
        </div>
        <div className="mt-3 min-h-7">
          <ShortcutKeyPreview keys={displayKeys} />
        </div>
      </button>
      <div className="min-h-5 text-xs">
        {!candidate ? (
          <p className="text-muted-foreground">
            Capture a key combination to continue.
          </p>
        ) : conflictAction ? (
          <p className="text-destructive">
            Already in use by {conflictActionLabel}. Choose another shortcut.
          </p>
        ) : hasChange ? (
          <p className="text-emerald-600">Shortcut is available.</p>
        ) : (
          <p className="text-muted-foreground">Shortcut is unchanged.</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            resetBinding(action.id);
            closeDialog();
          }}
        >
          Reset
        </Button>
        <Button type="button" variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
        <Button type="button" onClick={saveCandidate} disabled={!canSave}>
          Save
          <span className="ml-2">
            <ShortcutKbd
              actionId={SAVE_SHORTCUT_EDITOR_SHORTCUT.id}
              defaultBinding={SAVE_SHORTCUT_EDITOR_SHORTCUT.defaultBinding}
              interaction="trigger-parent"
              interactive={false}
            />
          </span>
        </Button>
      </div>
    </section>
  );
}

function KeyboardShortcutSettingsDialog() {
  const context = React.useContext(ShortcutContext);
  const actionsByScope = React.useMemo(() => {
    const map = new Map<string, ShortcutDefinition[]>();
    for (const definition of Object.values(context?.registry ?? {})) {
      const key = toUserFacingShortcutScope(definition.scope);
      const label =
        sanitizeInternalShortcutText(definition.label) || definition.label;
      const description = sanitizeInternalShortcutText(definition.description);
      const current = map.get(key) ?? [];
      current.push({
        ...definition,
        scope: key,
        label,
        description: description || undefined,
      });
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
  const selectedAction = dialogState.selectedActionId
    ? context.registry[dialogState.selectedActionId]
    : undefined;
  const selectedActionLabel = selectedAction
    ? sanitizeInternalShortcutText(selectedAction.label) || selectedAction.label
    : '';
  const selectedActionDescription = selectedAction
    ? sanitizeInternalShortcutText(selectedAction.description) || undefined
    : undefined;
  const selectedActionScope = selectedAction
    ? toUserFacingShortcutScope(selectedAction.scope)
    : undefined;
  const isSingleActionMode = Boolean(dialogState.selectedActionId);

  return (
    <Dialog
      open={dialogState.open}
      onOpenChange={(open) => !open && closeDialog()}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isSingleActionMode ? 'Edit Shortcut' : 'Keyboard Shortcuts'}
          </DialogTitle>
          <DialogDescription>
            {isSingleActionMode
              ? 'Press a new key combination to update this shortcut.'
              : 'Click a shortcut and press a new key combination. Preferences are saved in local storage.'}
          </DialogDescription>
        </DialogHeader>
        {!isSingleActionMode ? (
          <div className="flex items-center justify-end">
            <Button type="button" variant="ghost" onClick={resetAllBindings}>
              Reset all
            </Button>
          </div>
        ) : null}
        <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
          {isSingleActionMode ? (
            selectedAction ? (
              <SingleShortcutEditor
                action={{
                  ...selectedAction,
                  label: selectedActionLabel,
                  description: selectedActionDescription,
                  scope: selectedActionScope,
                }}
                binding={
                  bindings[selectedAction.id] ?? selectedAction.defaultBinding
                }
                bindings={bindings}
                registry={context.registry}
                setBinding={setBinding}
                resetBinding={resetBinding}
                closeDialog={closeDialog}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This shortcut is not registered yet.
              </p>
            )
          ) : actionsByScope.length === 0 ? (
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
  setBinding: (
    actionId: ShortcutActionId,
    binding: ShortcutBinding,
  ) => {
    updated: boolean;
    replacedActionId?: ShortcutActionId;
  };
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
