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
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ShortcutActionId = string;

export type ShortcutStroke = {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
};

export type ShortcutBinding = ShortcutStroke & {
  sequence?: ShortcutStroke[];
};

export type ShortcutScope = string;

export type ShortcutDefinition = {
  id: ShortcutActionId;
  label: string;
  description?: string;
  scope?: ShortcutScope;
  defaultBinding: ShortcutBinding;
};

type UIBuilderFocusShortcutAction = 'focusSelected' | 'exitFocus';

export const UI_BUILDER_FOCUS_SHORTCUTS = {
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
} as const satisfies Record<UIBuilderFocusShortcutAction, ShortcutDefinition>;

const STORAGE_KEY = 'auto-admin-shortcuts-v3';
const SEQUENCE_TIMEOUT_STORAGE_KEY = 'auto-admin-shortcuts-sequence-timeout-v1';
const MIN_SEQUENCE_TIMEOUT_MS = 150;
const MAX_SEQUENCE_TIMEOUT_MS = 1500;
const DEFAULT_SEQUENCE_TIMEOUT_MS = 500;

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
  sequenceTimeoutMs: number;
  setSequenceTimeoutMs: (nextTimeoutMs: number) => void;
  registerShortcut: (definition: ShortcutDefinition) => void;
  registerActionHandler: (
    actionId: ShortcutActionId,
    listener: {
      definition: ShortcutDefinition;
      allowInEditableContext: () => boolean;
      enabled: () => boolean;
      guard?: (event: KeyboardEvent) => boolean;
      handler: (event: KeyboardEvent) => void;
    },
  ) => () => void;
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

function normalizeStroke(stroke: ShortcutStroke): ShortcutStroke {
  return {
    key: normalizeKey(stroke.key),
    ctrl: Boolean(stroke.ctrl),
    meta: Boolean(stroke.meta),
    alt: Boolean(stroke.alt),
    shift: Boolean(stroke.shift),
  };
}

function getBindingSequence(binding: ShortcutBinding): ShortcutStroke[] {
  const sequence = binding.sequence?.length
    ? binding.sequence
    : [
        {
          key: binding.key,
          ctrl: binding.ctrl,
          meta: binding.meta,
          alt: binding.alt,
          shift: binding.shift,
        },
      ];
  return sequence
    .map((stroke) => normalizeStroke(stroke))
    .filter(
      (stroke) =>
        stroke.key.trim().length > 0 ||
        stroke.ctrl ||
        stroke.meta ||
        stroke.alt ||
        stroke.shift,
    );
}

function buildBindingFromSequence(sequence: ShortcutStroke[]): ShortcutBinding {
  const normalizedSequence = sequence.map((stroke) => normalizeStroke(stroke));
  const firstStroke = normalizedSequence[0] ?? {
    key: '',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  };
  if (normalizedSequence.length <= 1) {
    return firstStroke;
  }
  return {
    ...firstStroke,
    sequence: normalizedSequence,
  };
}

function isBindingMatch(
  event: KeyboardEvent,
  binding: ShortcutBinding,
): boolean {
  const sequence = getBindingSequence(binding);
  if (sequence.length !== 1) return false;
  const stroke = sequence[0];
  const normalizedEventKey = normalizeKey(event.key);
  return (
    normalizedEventKey === stroke.key &&
    event.ctrlKey === stroke.ctrl &&
    event.metaKey === stroke.meta &&
    event.altKey === stroke.alt &&
    event.shiftKey === stroke.shift
  );
}

function isStrokeMatch(left: ShortcutStroke, right: ShortcutStroke): boolean {
  return (
    left.key === right.key &&
    left.ctrl === right.ctrl &&
    left.meta === right.meta &&
    left.alt === right.alt &&
    left.shift === right.shift
  );
}

function isSequencePrefixMatch(
  sequence: ShortcutStroke[],
  prefix: ShortcutStroke[],
): boolean {
  if (prefix.length > sequence.length) return false;
  return prefix.every((stroke, index) =>
    isStrokeMatch(stroke, sequence[index]),
  );
}

function isModifierOnlyKey(key: string): boolean {
  return (
    key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta'
  );
}

function isSameBinding(left: ShortcutBinding, right: ShortcutBinding): boolean {
  const leftSequence = getBindingSequence(left);
  const rightSequence = getBindingSequence(right);
  if (leftSequence.length !== rightSequence.length) return false;
  return leftSequence.every((stroke, index) => {
    const other = rightSequence[index];
    return (
      stroke.key === other.key &&
      stroke.ctrl === other.ctrl &&
      stroke.meta === other.meta &&
      stroke.alt === other.alt &&
      stroke.shift === other.shift
    );
  });
}

function displayStroke(stroke: ShortcutStroke): string[] {
  if (
    stroke.key.trim().length === 0 &&
    !stroke.ctrl &&
    !stroke.meta &&
    !stroke.alt &&
    !stroke.shift
  ) {
    return [];
  }
  const keys: string[] = [];
  if (stroke.meta) keys.push(getMetaKeyLabel());
  if (stroke.ctrl) keys.push('Ctrl');
  if (stroke.alt) keys.push('Alt');
  if (stroke.shift) keys.push('Shift');
  if (stroke.key === ' ') {
    keys.push('Space');
  } else if (stroke.key.length === 1) {
    keys.push(stroke.key.toUpperCase());
  } else {
    keys.push(stroke.key);
  }
  return keys;
}

function displayBindingSteps(binding: ShortcutBinding): string[][] {
  const sequence = getBindingSequence(binding);
  if (!sequence.length) return [];
  return sequence.map((stroke) => displayStroke(stroke));
}

function displayBinding(binding: ShortcutBinding): string[] {
  return displayBindingSteps(binding).map((step) => step.join(' + '));
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
    const parsed = JSON.parse(raw) as Record<ShortcutActionId, ShortcutBinding>;
    const normalizedEntries = Object.entries(parsed).map(
      ([actionId, binding]) => [
        actionId,
        buildBindingFromSequence(getBindingSequence(binding)),
      ],
    );
    return Object.fromEntries(normalizedEntries);
  } catch {
    return {};
  }
}

function persistBindings(bindings: Record<ShortcutActionId, ShortcutBinding>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

function normalizeSequenceTimeoutMs(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SEQUENCE_TIMEOUT_MS;
  return Math.min(
    MAX_SEQUENCE_TIMEOUT_MS,
    Math.max(MIN_SEQUENCE_TIMEOUT_MS, Math.round(value)),
  );
}

function loadStoredSequenceTimeoutMs(): number {
  if (typeof window === 'undefined') return DEFAULT_SEQUENCE_TIMEOUT_MS;
  try {
    const raw = window.localStorage.getItem(SEQUENCE_TIMEOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_SEQUENCE_TIMEOUT_MS;
    return normalizeSequenceTimeoutMs(Number.parseInt(raw, 10));
  } catch {
    return DEFAULT_SEQUENCE_TIMEOUT_MS;
  }
}

function persistSequenceTimeoutMs(value: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SEQUENCE_TIMEOUT_STORAGE_KEY, String(value));
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

type RegisteredShortcutActionListener = {
  id: number;
  actionId: ShortcutActionId;
  definition: ShortcutDefinition;
  allowInEditableContext: () => boolean;
  enabled: () => boolean;
  guard?: (event: KeyboardEvent) => boolean;
  handler: (event: KeyboardEvent) => void;
};

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
  const [sequenceTimeoutMs, setSequenceTimeoutMsState] = React.useState<number>(
    () => loadStoredSequenceTimeoutMs(),
  );
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    selectedActionId?: ShortcutActionId;
  }>({ open: false });
  const dialogOpenRef = React.useRef(dialogState.open);
  const listenersRef = React.useRef<RegisteredShortcutActionListener[]>([]);
  const listenerIdRef = React.useRef(0);
  const bindingsRef = React.useRef(bindings);
  const registryRef = React.useRef(registry);
  const sequenceTimeoutRef = React.useRef(sequenceTimeoutMs);
  const pendingSequenceRef = React.useRef<{
    strokes: ShortcutStroke[];
    exactMatches: RegisteredShortcutActionListener[];
    timeoutId: ReturnType<typeof window.setTimeout> | null;
  } | null>(null);

  React.useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  React.useEffect(() => {
    registryRef.current = registry;
  }, [registry]);

  React.useEffect(() => {
    sequenceTimeoutRef.current = sequenceTimeoutMs;
  }, [sequenceTimeoutMs]);

  dialogOpenRef.current = dialogState.open;

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
          isSameBinding(existing.defaultBinding, definition.defaultBinding)
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
      const normalizedBinding = buildBindingFromSequence(
        getBindingSequence(binding),
      );
      let replacedActionId: ShortcutActionId | undefined;
      let updated = false;
      updateBindings((current) => {
        const currentForAction =
          current[actionId] ?? registry[actionId]?.defaultBinding;
        if (
          currentForAction &&
          isSameBinding(currentForAction, normalizedBinding)
        ) {
          return current;
        }

        const next = { ...current };
        for (const [registeredActionId, definition] of Object.entries(
          registry,
        )) {
          if (registeredActionId === actionId) continue;
          const effective =
            current[registeredActionId] ?? definition.defaultBinding;
          if (isSameBinding(effective, normalizedBinding)) {
            next[registeredActionId] = definition.defaultBinding;
            replacedActionId = registeredActionId;
          }
        }
        next[actionId] = normalizedBinding;
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

  const setSequenceTimeoutMs = React.useCallback((nextTimeoutMs: number) => {
    const normalizedTimeoutMs = normalizeSequenceTimeoutMs(nextTimeoutMs);
    setSequenceTimeoutMsState(normalizedTimeoutMs);
    persistSequenceTimeoutMs(normalizedTimeoutMs);
  }, []);

  const openDialog = React.useCallback((actionId?: ShortcutActionId) => {
    setDialogState({ open: true, selectedActionId: actionId });
  }, []);

  const closeDialog = React.useCallback(() => {
    setDialogState({ open: false, selectedActionId: undefined });
  }, []);

  const clearPendingSequence = React.useCallback(() => {
    if (!pendingSequenceRef.current) return;
    if (pendingSequenceRef.current.timeoutId !== null) {
      window.clearTimeout(pendingSequenceRef.current.timeoutId);
    }
    pendingSequenceRef.current = null;
  }, []);

  const runActionListener = React.useCallback(
    (
      listener: RegisteredShortcutActionListener,
      event: KeyboardEvent,
      editableContext: boolean,
    ) => {
      if (!listener.enabled()) return false;
      if (editableContext && !listener.allowInEditableContext()) return false;
      if (listener.guard && !listener.guard(event)) return false;
      listener.handler(event);
      return true;
    },
    [],
  );

  const schedulePendingSequence = React.useCallback(
    (
      pendingStrokes: ShortcutStroke[],
      exactMatches: RegisteredShortcutActionListener[],
      event: KeyboardEvent,
    ) => {
      clearPendingSequence();
      const timeoutId = window.setTimeout(() => {
        const pending = pendingSequenceRef.current;
        if (!pending) return;
        if (!isSequencePrefixMatch(pending.strokes, pendingStrokes)) return;
        const editableContext = isEditableContext(event);
        for (const listener of pending.exactMatches) {
          if (runActionListener(listener, event, editableContext)) {
            break;
          }
        }
        clearPendingSequence();
      }, sequenceTimeoutRef.current);
      pendingSequenceRef.current = {
        strokes: pendingStrokes,
        exactMatches,
        timeoutId,
      };
    },
    [clearPendingSequence, runActionListener],
  );

  React.useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (dialogOpenRef.current) {
        clearPendingSequence();
        return;
      }
      if (isModifierOnlyKey(event.key)) return;

      const editableContext = isEditableContext(event);
      const inputStroke = createBindingFromKeyboardEvent(event);
      const pendingSequence = pendingSequenceRef.current?.strokes ?? [];

      const collectMatches = (candidateSequence: ShortcutStroke[]) => {
        const exactMatches: RegisteredShortcutActionListener[] = [];
        let hasLongerPrefix = false;

        for (const listener of listenersRef.current) {
          if (!listener.enabled()) continue;
          if (editableContext && !listener.allowInEditableContext()) continue;
          if (listener.guard && !listener.guard(event)) continue;

          const definition =
            registryRef.current[listener.actionId] ?? listener.definition;
          const binding =
            bindingsRef.current[listener.actionId] ?? definition.defaultBinding;
          const sequence = getBindingSequence(binding);
          if (!isSequencePrefixMatch(sequence, candidateSequence)) continue;
          if (sequence.length === candidateSequence.length) {
            exactMatches.push(listener);
          } else {
            hasLongerPrefix = true;
          }
        }
        return { exactMatches, hasLongerPrefix };
      };

      const extendedSequence = [...pendingSequence, inputStroke];
      let candidateSequence = extendedSequence;
      let matches = collectMatches(candidateSequence);

      if (!matches.exactMatches.length && !matches.hasLongerPrefix) {
        candidateSequence = [inputStroke];
        matches = collectMatches(candidateSequence);
      }

      if (!matches.exactMatches.length && !matches.hasLongerPrefix) {
        clearPendingSequence();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (matches.hasLongerPrefix) {
        schedulePendingSequence(candidateSequence, matches.exactMatches, event);
        return;
      }

      clearPendingSequence();
      for (const listener of matches.exactMatches) {
        if (runActionListener(listener, event, editableContext)) {
          break;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      clearPendingSequence();
    };
  }, [clearPendingSequence, runActionListener, schedulePendingSequence]);

  const registerActionHandler = React.useCallback(
    (
      actionId: ShortcutActionId,
      listener: {
        definition: ShortcutDefinition;
        allowInEditableContext: () => boolean;
        enabled: () => boolean;
        guard?: (event: KeyboardEvent) => boolean;
        handler: (event: KeyboardEvent) => void;
      },
    ) => {
      const registeredListener: RegisteredShortcutActionListener = {
        id: listenerIdRef.current++,
        actionId,
        definition: listener.definition,
        allowInEditableContext: listener.allowInEditableContext,
        enabled: listener.enabled,
        guard: listener.guard,
        handler: listener.handler,
      };
      listenersRef.current = [...listenersRef.current, registeredListener];

      return () => {
        listenersRef.current = listenersRef.current.filter(
          (currentListener) => currentListener.id !== registeredListener.id,
        );
      };
    },
    [],
  );

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
      sequenceTimeoutMs,
      setSequenceTimeoutMs,
      registerShortcut,
      registerActionHandler,
    }),
    [
      bindings,
      closeDialog,
      dialogState,
      openDialog,
      registerActionHandler,
      registerShortcut,
      registry,
      resetAllBindings,
      resetBinding,
      sequenceTimeoutMs,
      setSequenceTimeoutMs,
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
  const sequence = getBindingSequence(binding);
  if (!sequence.length) return;
  const dispatch = (stroke: ShortcutStroke) => {
    const event = new KeyboardEvent('keydown', {
      key: stroke.key,
      ctrlKey: stroke.ctrl,
      metaKey: stroke.meta,
      altKey: stroke.alt,
      shiftKey: stroke.shift,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  };

  const dispatchSequence = () => {
    for (const [index, stroke] of sequence.entries()) {
      if (index === 0) {
        dispatch(stroke);
      } else {
        window.setTimeout(() => dispatch(stroke), index * 16);
      }
    }
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
    window.requestAnimationFrame(dispatchSequence);
    return;
  }
  dispatchSequence();
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
            bindingLabel: displayBinding(binding).join(' then '),
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
  const context = React.useContext(ShortcutContext);
  const binding = useShortcutBinding(definition.id, definition.defaultBinding);
  const enabledRef = React.useRef(enabled);
  const guardRef = React.useRef(guard);
  const allowInEditableContextRef = React.useRef(allowInEditableContext);
  const handlerRef = React.useRef(handler);

  enabledRef.current = enabled;
  guardRef.current = guard;
  allowInEditableContextRef.current = allowInEditableContext;
  handlerRef.current = handler;

  useRegisterShortcut(definition);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    if (context) {
      return context.registerActionHandler(definition.id, {
        definition,
        allowInEditableContext: () => allowInEditableContextRef.current,
        enabled: () => enabledRef.current,
        guard: (event) => guardRef.current?.(event) ?? true,
        handler: (event) => handlerRef.current(event),
      });
    }

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
  }, [
    allowInEditableContext,
    binding,
    context,
    definition,
    enabled,
    guard,
    handler,
  ]);
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

function ShortcutStepCaps({ parts }: { parts: string[] }) {
  const partCounts = new Map<string, number>();
  return (
    <span className="inline-flex items-center gap-1">
      {parts.map((part) => {
        const partCount = (partCounts.get(part) ?? 0) + 1;
        partCounts.set(part, partCount);
        return (
          <React.Fragment key={`${part}-${partCount}`}>
            {partCount > 1 ? (
              <span className="text-muted-foreground/80">+</span>
            ) : null}
            <span className="rounded border border-border/70 bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium leading-none shadow-none">
              {part}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
}

function ShortcutKeyGroup({
  actionId,
  binding,
}: {
  actionId: ShortcutActionId;
  binding: ShortcutBinding;
}) {
  const steps = displayBindingSteps(binding);
  const stepCounts = new Map<string, number>();
  return (
    <ButtonGroup className="pointer-events-none">
      <ButtonGroupText
        className="h-7 gap-1 rounded-md border-border/60 bg-muted/70 px-2 text-xs font-medium shadow-none"
        aria-hidden="true"
      >
        {steps.map((step) => {
          const signature = step.join('+');
          const stepCount = (stepCounts.get(signature) ?? 0) + 1;
          stepCounts.set(signature, stepCount);
          return (
            <React.Fragment key={`${actionId}-${signature}-${stepCount}`}>
              {stepCount > 1 ? (
                <span className="px-1 text-[11px] text-muted-foreground/80">
                  then
                </span>
              ) : null}
              <ShortcutStepCaps parts={step} />
            </React.Fragment>
          );
        })}
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
  const context = React.useContext(ShortcutContext);
  const sequenceTimeoutMs =
    context?.sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS;
  const [recording, setRecording] = React.useState(false);
  const [previewBinding, setPreviewBinding] = React.useState(binding);
  const [status, setStatus] = React.useState<string | null>(null);
  const pendingSequenceRef = React.useRef<ShortcutStroke[]>([]);
  const finalizeTimeoutRef = React.useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);

  React.useEffect(() => {
    if (!recording) {
      setPreviewBinding(binding);
    }
  }, [binding, recording]);

  React.useEffect(() => {
    if (!recording) return;
    const clearFinalizeTimeout = () => {
      if (finalizeTimeoutRef.current !== null) {
        window.clearTimeout(finalizeTimeoutRef.current);
      }
      finalizeTimeoutRef.current = null;
    };

    const finalizeRecording = () => {
      const sequence = pendingSequenceRef.current;
      if (!sequence.length) return;
      const nextBinding = buildBindingFromSequence(sequence);
      const result = onChange(nextBinding);
      if (!result.updated) {
        setStatus('Shortcut unchanged');
      } else if (result.replacedActionId) {
        setStatus(`Reassigned from ${result.replacedActionId}`);
      } else {
        setStatus('Shortcut updated');
      }
      setRecording(false);
      clearFinalizeTimeout();
      pendingSequenceRef.current = [];
    };

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const normalized = normalizeKey(event.key);
      if (normalized === 'Escape' && !event.ctrlKey && !event.metaKey) {
        setRecording(false);
        setStatus(null);
        setPreviewBinding(binding);
        clearFinalizeTimeout();
        pendingSequenceRef.current = [];
        return;
      }

      const nextStroke: ShortcutStroke = {
        key: normalized,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        alt: event.altKey,
        shift: event.shiftKey,
      };
      if (isModifierOnlyKey(event.key)) return;

      pendingSequenceRef.current = [...pendingSequenceRef.current, nextStroke];
      setPreviewBinding(buildBindingFromSequence(pendingSequenceRef.current));

      clearFinalizeTimeout();
      finalizeTimeoutRef.current = window.setTimeout(
        finalizeRecording,
        sequenceTimeoutMs,
      );
    };

    const onKeyUp = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      clearFinalizeTimeout();
    };
  }, [binding, onChange, recording, sequenceTimeoutMs]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setStatus(null);
          pendingSequenceRef.current = [];
          setPreviewBinding(binding);
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
          Press keys in order. Pause for {sequenceTimeoutMs}ms to finish. Press
          Escape to cancel.
        </p>
      ) : null}
      {!recording && status ? (
        <p className="text-[11px] text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}

type ShortcutConflictDetails = {
  exactConflict?: ShortcutDefinition;
  prefixConflicts: ShortcutDefinition[];
};

function findShortcutConflictDetails(
  actionId: ShortcutActionId,
  binding: ShortcutBinding,
  registry: Record<ShortcutActionId, ShortcutDefinition>,
  bindings: Record<ShortcutActionId, ShortcutBinding>,
): ShortcutConflictDetails {
  const targetSequence = getBindingSequence(binding);
  let exactConflict: ShortcutDefinition | undefined;
  const prefixConflicts: ShortcutDefinition[] = [];

  for (const definition of Object.values(registry)) {
    if (definition.id === actionId) continue;
    const existingBinding =
      bindings[definition.id] ?? definition.defaultBinding;
    const existingSequence = getBindingSequence(existingBinding);
    if (isSameBinding(existingBinding, binding)) {
      exactConflict = definition;
      continue;
    }
    const sharesPrefix =
      isSequencePrefixMatch(targetSequence, existingSequence) ||
      isSequencePrefixMatch(existingSequence, targetSequence);
    if (sharesPrefix) {
      prefixConflicts.push(definition);
    }
  }
  return { exactConflict, prefixConflicts };
}

function keyToLabel(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function createBindingFromKeyboardEvent(event: KeyboardEvent): ShortcutStroke {
  return {
    key: normalizeKey(event.key),
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
  };
}

function createPreviewKeysFromBinding(binding: ShortcutBinding): string[] {
  return getBindingSequence(binding).map((stroke) => {
    const parts: string[] = [];
    if (stroke.meta) parts.push(getMetaKeyLabel());
    if (stroke.ctrl) parts.push('Ctrl');
    if (stroke.alt) parts.push('Alt');
    if (stroke.shift) parts.push('Shift');
    if (!isModifierOnlyKey(stroke.key)) {
      parts.push(keyToLabel(stroke.key));
    }
    return parts.join(' + ');
  });
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
        className="h-7 gap-1 rounded-md border-border/60 bg-muted/70 px-2 text-xs font-medium shadow-none"
        aria-hidden="true"
      >
        {(() => {
          const keyCounts = new Map<string, number>();
          return keys.map((key) => {
            const keyCount = (keyCounts.get(key) ?? 0) + 1;
            keyCounts.set(key, keyCount);
            return (
              <React.Fragment key={`${key}-${keyCount}`}>
                {keyCount > 1 ? (
                  <span className="px-1 text-[11px] text-muted-foreground/80">
                    then
                  </span>
                ) : null}
                <ShortcutStepCaps parts={key.split(' + ')} />
              </React.Fragment>
            );
          });
        })()}
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
  const context = React.useContext(ShortcutContext);
  const sequenceTimeoutMs =
    context?.sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS;
  const captureRef = React.useRef<HTMLButtonElement | null>(null);
  const pendingSequenceRef = React.useRef<ShortcutStroke[]>([]);
  const finalizeTimeoutRef = React.useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);
  const [isListening, setIsListening] = React.useState(true);
  const [candidate, setCandidate] = React.useState<ShortcutBinding | null>(
    null,
  );
  const [previewKeys, setPreviewKeys] = React.useState<string[]>([]);

  const conflictDetails = React.useMemo(
    () =>
      candidate
        ? findShortcutConflictDetails(action.id, candidate, registry, bindings)
        : { exactConflict: undefined, prefixConflicts: [] },
    [action.id, bindings, candidate, registry],
  );
  const exactConflictLabel = conflictDetails.exactConflict
    ? sanitizeInternalShortcutText(conflictDetails.exactConflict.label) ||
      conflictDetails.exactConflict.label
    : undefined;
  const prefixConflictLabels = conflictDetails.prefixConflicts
    .map(
      (conflict) =>
        sanitizeInternalShortcutText(conflict.label) || conflict.label,
    )
    .slice(0, 2);
  const hasPrefixConflict = conflictDetails.prefixConflicts.length > 0;
  const displayKeys =
    previewKeys.length > 0
      ? previewKeys
      : candidate
        ? createPreviewKeysFromBinding(candidate)
        : [];
  const hasChange = candidate ? !isSameBinding(candidate, binding) : false;
  const canSave =
    Boolean(candidate) && hasChange && !conflictDetails.exactConflict;

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
    const clearFinalizeTimeout = () => {
      if (finalizeTimeoutRef.current !== null) {
        window.clearTimeout(finalizeTimeoutRef.current);
      }
      finalizeTimeoutRef.current = null;
    };

    const finalizeSequenceCandidate = () => {
      clearFinalizeTimeout();
      if (!pendingSequenceRef.current.length) return;
      const nextBinding = buildBindingFromSequence(pendingSequenceRef.current);
      setCandidate(nextBinding);
      setPreviewKeys(createPreviewKeysFromBinding(nextBinding));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      const normalized = normalizeKey(event.key);
      if (normalized === 'Escape' && !event.ctrlKey && !event.metaKey) {
        clearFinalizeTimeout();
        pendingSequenceRef.current = [];
        setPreviewKeys([]);
        setCandidate(null);
        return;
      }

      const nextStroke = createBindingFromKeyboardEvent(event);
      if (isModifierOnlyKey(event.key)) {
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

      pendingSequenceRef.current = [...pendingSequenceRef.current, nextStroke];
      const previewBinding = buildBindingFromSequence(
        pendingSequenceRef.current,
      );
      setPreviewKeys(createPreviewKeysFromBinding(previewBinding));
      setCandidate(previewBinding);

      clearFinalizeTimeout();
      finalizeTimeoutRef.current = window.setTimeout(
        finalizeSequenceCandidate,
        sequenceTimeoutMs,
      );
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
      } else if (!pendingSequenceRef.current.length) {
        setPreviewKeys([]);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      clearFinalizeTimeout();
    };
  }, [isListening, sequenceTimeoutMs]);

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
          pendingSequenceRef.current = [];
          setCandidate(null);
          setPreviewKeys([]);
          setIsListening(true);
        }}
        onBlur={() => setIsListening(false)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">New shortcut</p>
            <p className="text-xs text-muted-foreground">
              Press keys in order. Pause for {sequenceTimeoutMs}ms to finish.
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
        ) : conflictDetails.exactConflict ? (
          <p className="text-destructive">
            Already in use by {exactConflictLabel}. Choose another shortcut.
          </p>
        ) : hasPrefixConflict ? (
          <p className="text-amber-600">
            Shares a prefix with {prefixConflictLabels.join(' and ')}. The
            shorter shortcut waits for timeout before firing.
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
        </Button>
      </div>
    </section>
  );
}

function KeyboardShortcutSettingsDialog() {
  const context = React.useContext(ShortcutContext);
  const sequenceTimeoutMs =
    context?.sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS;
  const [sequenceTimeoutInputValue, setSequenceTimeoutInputValue] =
    React.useState<string>(() => String(sequenceTimeoutMs));

  React.useEffect(() => {
    setSequenceTimeoutInputValue(String(sequenceTimeoutMs));
  }, [sequenceTimeoutMs]);

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
    setSequenceTimeoutMs,
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
              ? 'Press one or more keys in sequence to update this shortcut.'
              : 'Click a shortcut and press keys in order. Preferences are saved in local storage.'}
          </DialogDescription>
        </DialogHeader>
        {!isSingleActionMode ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Sequence timeout (ms)
                </span>
                <Input
                  type="number"
                  min={MIN_SEQUENCE_TIMEOUT_MS}
                  max={MAX_SEQUENCE_TIMEOUT_MS}
                  step={25}
                  className="h-8 w-24"
                  value={sequenceTimeoutInputValue}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    setSequenceTimeoutInputValue(nextValue);
                    const parsedValue = Number.parseInt(nextValue, 10);
                    if (Number.isFinite(parsedValue)) {
                      setSequenceTimeoutMs(parsedValue);
                    }
                  }}
                  onBlur={() => {
                    const parsedValue = Number.parseInt(
                      sequenceTimeoutInputValue,
                      10,
                    );
                    setSequenceTimeoutMs(parsedValue);
                  }}
                />
              </div>
              <Button type="button" variant="ghost" onClick={resetAllBindings}>
                Reset all
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Shorter shortcuts that share a prefix wait this long before
              firing.
            </p>
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
