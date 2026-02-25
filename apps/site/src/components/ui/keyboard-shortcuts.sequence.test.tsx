// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KeyboardShortcutLegend,
  KeyboardShortcutsBoundary,
  type ShortcutDefinition,
  UI_BUILDER_FOCUS_SHORTCUTS,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? children : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const SINGLE_SHORTCUT: ShortcutDefinition = {
  id: 'test.singleF',
  label: 'Single F',
  scope: 'Tests',
  defaultBinding: {
    key: 'f',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  },
};

const SEQUENCE_SHORTCUT: ShortcutDefinition = {
  id: 'test.sequenceFA',
  label: 'Sequence F then A',
  scope: 'Tests',
  defaultBinding: {
    key: 'f',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    sequence: [
      {
        key: 'f',
        ctrl: false,
        meta: false,
        alt: false,
        shift: false,
      },
      {
        key: 'a',
        ctrl: false,
        meta: false,
        alt: false,
        shift: false,
      },
    ],
  },
};

const G_H_SHORTCUT: ShortcutDefinition = {
  id: 'test.sequenceGH',
  label: 'Sequence G then H',
  scope: 'Tests',
  defaultBinding: {
    key: 'g',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    sequence: [
      { key: 'g', ctrl: false, meta: false, alt: false, shift: false },
      { key: 'h', ctrl: false, meta: false, alt: false, shift: false },
    ],
  },
};

const G_L_SHORTCUT: ShortcutDefinition = {
  id: 'test.sequenceGL',
  label: 'Sequence G then L',
  scope: 'Tests',
  defaultBinding: {
    key: 'g',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    sequence: [
      { key: 'g', ctrl: false, meta: false, alt: false, shift: false },
      { key: 'l', ctrl: false, meta: false, alt: false, shift: false },
    ],
  },
};

const EDITABLE_SHORTCUT: ShortcutDefinition = {
  id: 'test.focusSearch',
  label: 'Focus Search',
  scope: 'Tests',
  defaultBinding: {
    key: '/',
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  },
};

function dispatchKey(key: string, options?: Partial<KeyboardEventInit>) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SequenceHarness({
  onSingle,
  onSequence,
}: {
  onSingle: () => void;
  onSequence: () => void;
}) {
  useShortcutAction(SINGLE_SHORTCUT, () => onSingle());
  useShortcutAction(SEQUENCE_SHORTCUT, () => onSequence());
  return null;
}

function BranchHarness({ onGh, onGl }: { onGh: () => void; onGl: () => void }) {
  useShortcutAction(G_H_SHORTCUT, () => onGh());
  useShortcutAction(G_L_SHORTCUT, () => onGl());
  return null;
}

function EditableHarness({
  onEditable,
  allowInEditableContext,
}: {
  onEditable: () => void;
  allowInEditableContext: boolean;
}) {
  useShortcutAction(EDITABLE_SHORTCUT, () => onEditable(), {
    allowInEditableContext,
  });
  return <input aria-label="editable-target" />;
}

function BuilderFocusHarness({
  onFocusSelected,
  onExitFocus,
}: {
  onFocusSelected: () => void;
  onExitFocus: () => void;
}) {
  useShortcutAction(UI_BUILDER_FOCUS_SHORTCUTS.focusSelected, () => {
    onFocusSelected();
  });
  useShortcutAction(UI_BUILDER_FOCUS_SHORTCUTS.exitFocus, () => {
    onExitFocus();
  });
  return null;
}

let container: HTMLDivElement;
let root: Root;
let localStorageState = new Map<string, string>();

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('keyboard shortcut sequences', () => {
  beforeEach(() => {
    localStorageState = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => localStorageState.get(key) ?? null,
        setItem: (key: string, value: string) => {
          localStorageState.set(key, value);
        },
        removeItem: (key: string) => {
          localStorageState.delete(key);
        },
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.restoreAllMocks();
  });

  it('fires single-key shortcut after sequence timeout when no second key arrives', async () => {
    const onSingle = vi.fn();
    const onSequence = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <SequenceHarness onSingle={onSingle} onSequence={onSequence} />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('f');
    expect(onSingle).toHaveBeenCalledTimes(0);
    expect(onSequence).toHaveBeenCalledTimes(0);

    await sleep(550);

    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onSequence).toHaveBeenCalledTimes(0);
  });

  it('prefers longer sequence when second key is pressed within timeout', async () => {
    const onSingle = vi.fn();
    const onSequence = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <SequenceHarness onSingle={onSingle} onSequence={onSequence} />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('f');
    await sleep(120);
    dispatchKey('a');

    expect(onSequence).toHaveBeenCalledTimes(1);
    expect(onSingle).toHaveBeenCalledTimes(0);
  });

  it('supports multiple sequence branches sharing the same prefix', async () => {
    const onGh = vi.fn();
    const onGl = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <BranchHarness onGh={onGh} onGl={onGl} />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('g');
    await sleep(60);
    dispatchKey('h');
    expect(onGh).toHaveBeenCalledTimes(1);
    expect(onGl).toHaveBeenCalledTimes(0);

    dispatchKey('g');
    await sleep(60);
    dispatchKey('l');
    expect(onGh).toHaveBeenCalledTimes(1);
    expect(onGl).toHaveBeenCalledTimes(1);
  });

  it('respects custom sequence timeout from local storage', async () => {
    localStorageState.set('auto-admin-shortcuts-sequence-timeout-v1', '200');
    const onSingle = vi.fn();
    const onSequence = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <SequenceHarness onSingle={onSingle} onSequence={onSequence} />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('f');
    await sleep(230);

    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onSequence).toHaveBeenCalledTimes(0);
  });

  it('supports stored sequence bindings migration and execution', async () => {
    localStorageState.set(
      'auto-admin-shortcuts-v3',
      JSON.stringify({
        [SINGLE_SHORTCUT.id]: {
          key: 'f',
          ctrl: false,
          meta: false,
          alt: false,
          shift: false,
          sequence: [
            { key: 'x', ctrl: false, meta: false, alt: false, shift: false },
            { key: 'z', ctrl: false, meta: false, alt: false, shift: false },
          ],
        },
      }),
    );
    const onSingle = vi.fn();
    const onSequence = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <SequenceHarness onSingle={onSingle} onSequence={onSequence} />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('x');
    await sleep(80);
    dispatchKey('z');

    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onSequence).toHaveBeenCalledTimes(0);
  });

  it('honors allowInEditableContext option', async () => {
    const onEditableBlocked = vi.fn();
    root.render(
      <KeyboardShortcutsBoundary>
        <EditableHarness
          onEditable={onEditableBlocked}
          allowInEditableContext={false}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    const input = container.querySelector(
      'input[aria-label="editable-target"]',
    ) as HTMLInputElement;
    input.focus();
    dispatchKey('/');
    expect(onEditableBlocked).toHaveBeenCalledTimes(0);

    const onEditableAllowed = vi.fn();
    root.render(
      <KeyboardShortcutsBoundary>
        <EditableHarness
          onEditable={onEditableAllowed}
          allowInEditableContext
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    input.focus();
    dispatchKey('/');
    expect(onEditableAllowed).toHaveBeenCalledTimes(1);
  });

  it('exposes a user-facing sequence timeout setting and persists changes', async () => {
    root.render(
      <KeyboardShortcutsBoundary>
        <KeyboardShortcutLegend />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    const shortcutsButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Shortcuts'),
    );
    shortcutsButton?.click();
    await flush();

    const timeoutInput = container.querySelector(
      'input[type="number"]',
    ) as HTMLInputElement;
    expect(timeoutInput).toBeTruthy();

    fireEvent.input(timeoutInput, { target: { value: '325' } });
    fireEvent.blur(timeoutInput);
    await flush();

    expect(
      localStorageState.get('auto-admin-shortcuts-sequence-timeout-v1'),
    ).toBe('325');
  });

  it('triggers UI builder focus shortcuts with default bindings', async () => {
    const onFocusSelected = vi.fn();
    const onExitFocus = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <BuilderFocusHarness
          onFocusSelected={onFocusSelected}
          onExitFocus={onExitFocus}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('f', { metaKey: true, shiftKey: true });
    dispatchKey('Escape');

    expect(onFocusSelected).toHaveBeenCalledTimes(1);
    expect(onExitFocus).toHaveBeenCalledTimes(1);
  });

  it('supports rebound UI builder focus selected shortcut from persisted bindings', async () => {
    localStorageState.set(
      'auto-admin-shortcuts-v3',
      JSON.stringify({
        [UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.id]: {
          key: 'g',
          ctrl: true,
          meta: false,
          alt: true,
          shift: false,
        },
      }),
    );
    const onFocusSelected = vi.fn();
    const onExitFocus = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <BuilderFocusHarness
          onFocusSelected={onFocusSelected}
          onExitFocus={onExitFocus}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchKey('f', { metaKey: true, shiftKey: true });
    dispatchKey('g', { ctrlKey: true, altKey: true });

    expect(onFocusSelected).toHaveBeenCalledTimes(1);
    expect(onExitFocus).toHaveBeenCalledTimes(0);
  });
});
