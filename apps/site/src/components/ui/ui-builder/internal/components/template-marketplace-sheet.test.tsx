// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useGetMock, previewUiTemplateInstallMock } = vi.hoisted(() => ({
  useGetMock: vi.fn(),
  previewUiTemplateInstallMock: vi.fn(),
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
  ShortcutKbd: () => <span>kbd</span>,
  useShortcutAction: () => {},
}));

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
  });
});
