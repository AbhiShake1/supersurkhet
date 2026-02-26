// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KeyboardShortcutsBoundary,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import {
  focusFirstTemplateTarget,
  getFocusOrderForTab,
  getNextTemplateTab,
  getTemplateTabOrder,
  isEventWithinTemplateScope,
} from './template-keyboard-nav';
import {
  TemplateShortcutHint,
  TemplateShortcutSettingsEntry,
} from './template-shortcut-hints';
import {
  TEMPLATE_SHORTCUT_DEFINITIONS,
  TEMPLATE_SHORTCUTS,
} from './template-shortcuts';

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
  }) => (open ? <div>{children}</div> : null),
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

function dispatchShortcut(
  definition: (typeof TEMPLATE_SHORTCUTS)[keyof typeof TEMPLATE_SHORTCUTS],
) {
  const binding = definition.defaultBinding;
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
}

function ShortcutHarness({
  allowPreview,
  onOpenSheet,
  onPreviewInstall,
  onSwitchMarketplace,
}: {
  allowPreview: boolean;
  onOpenSheet: () => void;
  onPreviewInstall: () => void;
  onSwitchMarketplace: () => void;
}) {
  useShortcutAction(TEMPLATE_SHORTCUTS.openSheet, () => onOpenSheet());
  useShortcutAction(
    TEMPLATE_SHORTCUTS.previewInstall,
    () => onPreviewInstall(),
    {
      guard: () => allowPreview,
      enabled: true,
    },
  );
  useShortcutAction(TEMPLATE_SHORTCUTS.switchMarketplaceTab, () =>
    onSwitchMarketplace(),
  );

  return (
    <div>
      <TemplateShortcutSettingsEntry />
      <TemplateShortcutHint
        label="Switch to marketplace"
        actionId={TEMPLATE_SHORTCUTS.switchMarketplaceTab.id}
      >
        <button type="button">Marketplace</button>
      </TemplateShortcutHint>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;
let localStorageState = new Map<string, string>();

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findButtonByText(text: string) {
  return [...container.querySelectorAll('button')].find((button) =>
    button.textContent?.includes(text),
  );
}

describe('template shortcuts governance', () => {
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
    if (typeof window.localStorage?.removeItem === 'function') {
      window.localStorage.removeItem('auto-admin-shortcuts-v3');
    }
  });

  it('defines the full template action map with default bindings', () => {
    expect(TEMPLATE_SHORTCUT_DEFINITIONS).toHaveLength(7);
    expect(TEMPLATE_SHORTCUTS.openSheet.id).toBe(
      'uiBuilder.templates.openSheet',
    );
    expect(TEMPLATE_SHORTCUTS.switchMarketplaceTab.id).toBe(
      'uiBuilder.templates.switchMarketplaceTab',
    );
    expect(TEMPLATE_SHORTCUTS.switchPublishTab.id).toBe(
      'uiBuilder.templates.switchPublishTab',
    );
    expect(TEMPLATE_SHORTCUTS.focusMarketplaceSearch.id).toBe(
      'uiBuilder.templates.focusMarketplaceSearch',
    );
    expect(TEMPLATE_SHORTCUTS.previewInstall.id).toBe(
      'uiBuilder.templates.previewInstall',
    );
    expect(TEMPLATE_SHORTCUTS.applyTemplate.id).toBe(
      'uiBuilder.templates.applyTemplate',
    );
    expect(TEMPLATE_SHORTCUTS.publishTemplate.id).toBe(
      'uiBuilder.templates.publishTemplate',
    );
  });

  it('executes shortcuts and honors guard behavior', async () => {
    const onOpenSheet = vi.fn();
    const onPreviewInstall = vi.fn();
    const onSwitchMarketplace = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <ShortcutHarness
          allowPreview={false}
          onOpenSheet={onOpenSheet}
          onPreviewInstall={onPreviewInstall}
          onSwitchMarketplace={onSwitchMarketplace}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchShortcut(TEMPLATE_SHORTCUTS.openSheet);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);

    dispatchShortcut(TEMPLATE_SHORTCUTS.previewInstall);
    expect(onPreviewInstall).toHaveBeenCalledTimes(0);

    root.render(
      <KeyboardShortcutsBoundary>
        <ShortcutHarness
          allowPreview
          onOpenSheet={onOpenSheet}
          onPreviewInstall={onPreviewInstall}
          onSwitchMarketplace={onSwitchMarketplace}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    dispatchShortcut(TEMPLATE_SHORTCUTS.previewInstall);
    expect(onPreviewInstall).toHaveBeenCalledTimes(1);
  });

  it('blocks conflicting bindings in shortcut settings and applies valid rebinding', async () => {
    const onOpenSheet = vi.fn();
    const onPreviewInstall = vi.fn();
    const onSwitchMarketplace = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <ShortcutHarness
          allowPreview
          onOpenSheet={onOpenSheet}
          onPreviewInstall={onPreviewInstall}
          onSwitchMarketplace={onSwitchMarketplace}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    const shortcutSettingsButton = [
      ...container.querySelectorAll('button'),
    ].find(
      (button) =>
        button.getAttribute('aria-label') ===
        `Configure shortcut for ${TEMPLATE_SHORTCUTS.openSheet.id}`,
    );
    shortcutSettingsButton?.click();
    await flush();

    expect(container.textContent).toContain('Edit Shortcut');

    const conflicting = TEMPLATE_SHORTCUTS.switchMarketplaceTab.defaultBinding;
    const conflictingEvent = new KeyboardEvent('keydown', {
      key: conflicting.key,
      ctrlKey: conflicting.ctrl,
      metaKey: conflicting.meta,
      altKey: conflicting.alt,
      shiftKey: conflicting.shift,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(conflictingEvent);
    await flush();

    expect(container.textContent).toContain(
      'Already in use by Switch to marketplace tab',
    );

    const saveButtonWhenConflict = findButtonByText('Save');
    expect(saveButtonWhenConflict?.getAttribute('disabled')).not.toBeNull();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush();

    const availableEvent = new KeyboardEvent('keydown', {
      key: '9',
      metaKey: true,
      altKey: true,
      ctrlKey: false,
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(availableEvent);
    await flush();

    expect(container.textContent).toContain('Shortcut is available.');

    const saveButton = findButtonByText('Save');
    saveButton?.click();
    await flush();

    const rebindEvent = new KeyboardEvent('keydown', {
      key: '9',
      metaKey: true,
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(rebindEvent);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);

    dispatchShortcut(TEMPLATE_SHORTCUTS.openSheet);
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it('captures multi-step shortcuts in single-action editor and warns on prefix overlap', async () => {
    const onOpenSheet = vi.fn();
    const onPreviewInstall = vi.fn();
    const onSwitchMarketplace = vi.fn();

    root.render(
      <KeyboardShortcutsBoundary>
        <ShortcutHarness
          allowPreview
          onOpenSheet={onOpenSheet}
          onPreviewInstall={onPreviewInstall}
          onSwitchMarketplace={onSwitchMarketplace}
        />
      </KeyboardShortcutsBoundary>,
    );
    await flush();

    const shortcutSettingsButton = [
      ...container.querySelectorAll('button'),
    ].find(
      (button) =>
        button.getAttribute('aria-label') ===
        `Configure shortcut for ${TEMPLATE_SHORTCUTS.openSheet.id}`,
    );
    shortcutSettingsButton?.click();
    await flush();

    const prefixBinding =
      TEMPLATE_SHORTCUTS.switchMarketplaceTab.defaultBinding;
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: prefixBinding.key,
        ctrlKey: prefixBinding.ctrl,
        metaKey: prefixBinding.meta,
        altKey: prefixBinding.alt,
        shiftKey: prefixBinding.shift,
        bubbles: true,
        cancelable: true,
      }),
    );
    await sleep(60);
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      }),
    );
    await flush();

    expect(container.textContent).toContain('Shares a prefix with');

    const saveButton = findButtonByText('Save');
    saveButton?.click();
    await flush();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: prefixBinding.key,
        ctrlKey: prefixBinding.ctrl,
        metaKey: prefixBinding.meta,
        altKey: prefixBinding.alt,
        shiftKey: prefixBinding.shift,
        bubbles: true,
        cancelable: true,
      }),
    );
    await sleep(100);
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it('provides deterministic keyboard-only navigation helpers', () => {
    expect(getTemplateTabOrder()).toEqual(['marketplace', 'publish']);
    expect(getNextTemplateTab('marketplace', 'next')).toBe('publish');
    expect(getNextTemplateTab('marketplace', 'previous')).toBe('publish');
    expect(getFocusOrderForTab('publish')).toEqual([
      'shortcut-settings',
      'publish-button',
    ]);

    const searchInput = document.createElement('input');
    document.body.appendChild(searchInput);

    const focused = focusFirstTemplateTarget('marketplace', {
      search: searchInput,
    });

    expect(focused).toBe('search');
    expect(document.activeElement).toBe(searchInput);

    const scope = document.createElement('div');
    const child = document.createElement('button');
    scope.appendChild(child);
    document.body.appendChild(scope);

    let insideScope = false;
    const onKeyDown = (event: KeyboardEvent) => {
      insideScope = isEventWithinTemplateScope(event, scope);
    };
    window.addEventListener('keydown', onKeyDown, { once: true });

    child.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
    );
    expect(insideScope).toBe(true);

    searchInput.remove();
    scope.remove();
  });
});
