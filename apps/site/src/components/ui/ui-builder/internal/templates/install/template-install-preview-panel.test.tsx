// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (value: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

import { TemplateInstallPreviewPanel } from './template-install-preview-panel';

let container: HTMLDivElement;
let root: Root;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TemplateInstallPreviewPanel', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.clearAllMocks();
  });

  it('renders zero-conflict preview with enabled apply action', async () => {
    const onApplyTemplate = vi.fn();

    root.render(
      <TemplateInstallPreviewPanel
        preview={{
          templateId: 'acme/site/starter',
          version: '1.0.0',
          mergeSummary: {
            pagesAdded: 1,
            pagesMerged: 2,
            hardConflicts: 0,
          },
          pluginPlan: {
            install: [
              {
                pluginId: 'acme/plugin-a',
                version: '2.0.0',
                releaseMissingInTarget: true,
              },
            ],
            update: [],
            noOp: [
              {
                pluginId: 'acme/plugin-b',
                version: '1.0.0',
                releaseMissingInTarget: false,
              },
            ],
          },
          hardConflicts: [],
          requiresPluginUpdateConfirmation: false,
        }}
        confirmPluginUpdates={false}
        onConfirmPluginUpdatesChange={() => {}}
        onApplyTemplate={onApplyTemplate}
      />,
    );

    await flush();

    const applyButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Apply Template'),
    );

    expect(applyButton).toBeTruthy();
    expect(applyButton?.hasAttribute('disabled')).toBe(false);
    expect(container.textContent).toContain('Hydrates release');

    applyButton?.click();
    expect(onApplyTemplate).toHaveBeenCalledTimes(1);
  });

  it('renders hard conflicts and blocks apply with explicit reason', async () => {
    root.render(
      <TemplateInstallPreviewPanel
        preview={{
          templateId: 'acme/site/starter',
          version: '1.0.1',
          mergeSummary: {
            pagesAdded: 0,
            pagesMerged: 0,
            hardConflicts: 1,
          },
          pluginPlan: {
            install: [],
            update: [],
            noOp: [],
          },
          hardConflicts: [
            {
              code: 'id-type-mismatch',
              message: 'Layer type mismatch',
              pageKey: 'home',
              path: 'home.hero',
              layerId: 'hero',
            },
          ],
          requiresPluginUpdateConfirmation: false,
        }}
        confirmPluginUpdates={false}
        onConfirmPluginUpdatesChange={() => {}}
        onApplyTemplate={() => {}}
      />,
    );

    await flush();

    const applyButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Apply Template'),
    );

    expect(applyButton).toBeTruthy();
    expect(applyButton?.hasAttribute('disabled')).toBe(true);
    expect(container.textContent).toContain('Hard conflicts (1)');
    expect(container.textContent).toContain(
      'Apply is blocked until hard conflicts are resolved.',
    );
    expect(container.textContent).toContain('home.hero');
    expect(container.textContent).toContain('layer hero');
  });
});
