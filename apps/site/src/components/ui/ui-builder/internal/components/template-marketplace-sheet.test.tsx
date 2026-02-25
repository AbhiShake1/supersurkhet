// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_SHORTCUTS } from '@/components/ui/ui-builder/internal/templates/shortcuts/template-shortcuts';

const {
  useGetMock,
  previewUiTemplateInstallMock,
  useShortcutActionMock,
  publishShortcutIds,
} = vi.hoisted(() => ({
  useGetMock: vi.fn(),
  previewUiTemplateInstallMock: vi.fn(),
  useShortcutActionMock: vi.fn(),
  publishShortcutIds: [] as string[],
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  api: {
    uiTemplateRelease: {
      useGet: useGetMock,
    },
    businessUiTemplateInstall: {
      useGet: vi.fn(() => ({ data: [] })),
    },
  },
}));

vi.mock('@/server-functions/plugins', () => ({
  previewUiTemplateInstall: previewUiTemplateInstallMock,
  installUiTemplateRelease: vi.fn(),
  publishUiTemplateRelease: vi.fn(),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value?: string;
    onClick?: () => void;
  }) => (
    <button data-value={value} onClick={onClick} type="button">
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/keyboard-shortcuts', () => ({
  KeyboardShortcutsBoundary: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <>{children}</>,
  ShortcutKbd: ({ actionId }: { actionId: string }) => (
    <span data-shortcut-action-id={actionId}>kbd</span>
  ),
  useShortcutAction: useShortcutActionMock,
}));

vi.mock(
  '@/components/ui/ui-builder/internal/templates/marketplace/template-marketplace-panel',
  () => ({
    TemplateMarketplacePanel: ({
      onSelectionChange,
      onPreviewInstall,
    }: {
      onSelectionChange: (selection: {
        templateId: string;
        selectedVersion: string;
        resolvedVersion: string;
        preferLatestVersion: boolean;
      }) => void;
      onPreviewInstall: (selection: {
        templateId: string;
        selectedVersion: string;
        resolvedVersion: string;
        preferLatestVersion: boolean;
      }) => void;
    }) => (
      <div>
        <button
          type="button"
          onClick={() =>
            onSelectionChange({
              templateId: 'acme/site/starter',
              selectedVersion: '1.0.0',
              resolvedVersion: '1.0.0',
              preferLatestVersion: true,
            })
          }
        >
          Starter
        </button>
        <button
          type="button"
          onClick={() =>
            onPreviewInstall({
              templateId: 'acme/site/starter',
              selectedVersion: '1.0.0',
              resolvedVersion: '1.0.0',
              preferLatestVersion: true,
            })
          }
        >
          Preview Install
        </button>
      </div>
    ),
  }),
);

vi.mock(
  '@/components/ui/ui-builder/internal/templates/install/template-install-preview-panel',
  () => ({
    TemplateInstallPreviewPanel: ({
      preview,
      onApplyTemplate,
    }: {
      preview:
        | null
        | {
            hardConflicts: unknown[];
            requiresPluginUpdateConfirmation: boolean;
          };
      onApplyTemplate: () => void;
    }) => (
      <button
        type="button"
        onClick={onApplyTemplate}
        disabled={Boolean(preview && preview.hardConflicts.length > 0)}
      >
        Apply Template
      </button>
    ),
  }),
);

vi.mock(
  '@/components/ui/ui-builder/internal/templates/publish/template-publish-panel',
  () => ({
    TemplatePublishPanel: ({
      publishShortcut,
    }: {
      publishShortcut: { id: string };
    }) => {
      publishShortcutIds.push(publishShortcut.id);
      return <div data-testid="template-publish-panel" />;
    },
  }),
);

vi.mock(
  '@/components/ui/ui-builder/internal/templates/history/template-install-history-panel',
  () => ({
    TemplateInstallHistoryPanel: ({
      installs,
      releases,
    }: {
      installs: Array<{ id: string }>;
      releases: Array<{ id: string }>;
    }) => (
      <div data-testid="template-install-history-panel">
        history installs:{installs.length} releases:{releases.length}
      </div>
    ),
  }),
);

import { TemplateMarketplaceSheet } from './template-marketplace-sheet';

let container: HTMLDivElement;
let root: Root;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TemplateMarketplaceSheet', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useGetMock.mockReturnValue({
      data: [
        {
          id: 'acme/site/starter@1.0.0',
          templateId: 'acme/site/starter',
          version: '1.0.0',
          docs: {
            title: 'Starter',
            description: 'Starter template',
            category: 'restaurant',
            tags: ['starter'],
          },
          pluginBundles: [],
          publishedAt: '2026-02-25T00:00:00.000Z',
        },
      ],
    });
    previewUiTemplateInstallMock.mockResolvedValue({
      templateId: 'acme/site/starter',
      version: '1.0.0',
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
          message: 'conflict',
          pageKey: 'home',
          path: 'home.shared',
        },
      ],
      requiresPluginUpdateConfirmation: false,
    });
    publishShortcutIds.length = 0;
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    vi.clearAllMocks();
  });

  it('renders template action and blocks apply when hard conflicts exist', async () => {
    root.render(
      <TemplateMarketplaceSheet
        businessId="business-1"
        actorUserId="owner-1"
        actorRole="owner"
        layers={[]}
        onInstallApplied={() => {}}
      />,
    );
    await flush();

    const templateButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Starter'),
    );
    templateButton?.click();
    await flush();

    const previewButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Preview Install'),
    );
    if (!previewButton) {
      throw new Error('Preview button not found');
    }
    previewButton.click();
    await flush();

    const applyButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Apply Template'),
    );
    expect(applyButton).toBeTruthy();
    expect(applyButton?.getAttribute('disabled')).not.toBeNull();

    expect(
      container.querySelector('[data-testid="template-install-history-panel"]')
        ?.textContent,
    ).toContain('history installs:0 releases:1');
  });

  it('wires sheet shortcuts from shared template shortcut exports', async () => {
    root.render(
      <TemplateMarketplaceSheet
        businessId="business-1"
        actorUserId="owner-1"
        actorRole="owner"
        layers={[]}
        onInstallApplied={() => {}}
      />,
    );
    await flush();

    const actionDefinitions = useShortcutActionMock.mock.calls.map(
      (call) => call[0] as { id: string },
    );

    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.openSheet);
    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.switchMarketplaceTab);
    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.switchPublishTab);
    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.focusMarketplaceSearch);
    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.previewInstall);
    expect(actionDefinitions).toContain(TEMPLATE_SHORTCUTS.applyTemplate);

    const registeredActionIds = actionDefinitions.map((definition) => definition.id);
    expect(registeredActionIds).toContain(TEMPLATE_SHORTCUTS.openSheet.id);
    expect(registeredActionIds).toContain(TEMPLATE_SHORTCUTS.switchMarketplaceTab.id);
    expect(registeredActionIds).toContain(TEMPLATE_SHORTCUTS.switchPublishTab.id);
    expect(registeredActionIds).toContain(
      TEMPLATE_SHORTCUTS.focusMarketplaceSearch.id,
    );
    expect(registeredActionIds).toContain(TEMPLATE_SHORTCUTS.previewInstall.id);
    expect(registeredActionIds).toContain(TEMPLATE_SHORTCUTS.applyTemplate.id);

    expect(publishShortcutIds).toContain(TEMPLATE_SHORTCUTS.publishTemplate.id);

    const shortcutKbdIds = [
      ...container.querySelectorAll('[data-shortcut-action-id]'),
    ].map((element) => element.getAttribute('data-shortcut-action-id'));

    expect(shortcutKbdIds).toContain(TEMPLATE_SHORTCUTS.openSheet.id);
    expect(shortcutKbdIds).toContain(TEMPLATE_SHORTCUTS.switchMarketplaceTab.id);
    expect(shortcutKbdIds).toContain(TEMPLATE_SHORTCUTS.switchPublishTab.id);
    expect(shortcutKbdIds).toContain(TEMPLATE_SHORTCUTS.focusMarketplaceSearch.id);
  });
});
