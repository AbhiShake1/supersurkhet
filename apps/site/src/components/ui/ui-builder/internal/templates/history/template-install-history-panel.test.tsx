// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTemplatePreviewCache } from '@/lib/ui-builder/template-preview-cache';

const { previewUiTemplateInstallMock, installUiTemplateReleaseMock } =
  vi.hoisted(() => ({
    previewUiTemplateInstallMock: vi.fn(),
    installUiTemplateReleaseMock: vi.fn(),
  }));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/server-functions/plugins', () => ({
  previewUiTemplateInstall: previewUiTemplateInstallMock,
  installUiTemplateRelease: installUiTemplateReleaseMock,
}));

import { TemplateInstallHistoryPanel } from './template-install-history-panel';

let container: HTMLDivElement;
let root: Root;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function clickButton(label: string) {
  const button = [...container.querySelectorAll('button')].find((entry) =>
    entry.textContent?.includes(label),
  );
  if (!button) {
    throw new Error(`Button "${label}" not found`);
  }
  button.click();
}

describe('TemplateInstallHistoryPanel', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    clearTemplatePreviewCache();
    previewUiTemplateInstallMock.mockReset();
    installUiTemplateReleaseMock.mockReset();

    previewUiTemplateInstallMock.mockResolvedValue({
      templateId: 'acme/site/starter',
      version: '1.2.3',
      mergeSummary: {
        pagesAdded: 1,
        pagesMerged: 2,
        hardConflicts: 0,
      },
      pluginPlan: {
        install: [],
        update: [],
        noOp: [],
      },
      hardConflicts: [],
      requiresPluginUpdateConfirmation: false,
    });
    installUiTemplateReleaseMock.mockResolvedValue({
      layers: [],
    });
  });

  afterEach(() => {
    root.unmount();
    container.remove();
    clearTemplatePreviewCache();
    vi.clearAllMocks();
  });

  it('shows install history rows for the selected business and title metadata', async () => {
    root.render(
      <TemplateInstallHistoryPanel
        businessId="business-1"
        actorUserId="owner-1"
        actorRole="owner"
        layers={[]}
        installs={[
          {
            id: 'business-1::acme/site/starter',
            businessId: 'business-1',
            templateId: 'acme/site/starter',
            version: '1.2.3',
            installedByUserId: 'owner-1',
            installedAt: '2026-02-24T00:00:00.000Z',
            mergeStrategy: 'best-effort',
            status: 'active',
            summary: {
              pagesAdded: 2,
              pagesMerged: 1,
              conflictsCount: 0,
              pluginsInstalled: 1,
              pluginsUpdated: 0,
            },
          },
          {
            id: 'business-2::acme/site/starter',
            businessId: 'business-2',
            templateId: 'acme/site/starter',
            version: '1.2.3',
            installedByUserId: 'owner-2',
            installedAt: '2026-02-23T00:00:00.000Z',
            mergeStrategy: 'best-effort',
            status: 'active',
            summary: {
              pagesAdded: 0,
              pagesMerged: 0,
              conflictsCount: 0,
              pluginsInstalled: 0,
              pluginsUpdated: 0,
            },
          },
        ]}
        releases={[
          {
            id: 'acme/site/starter@1.2.3',
            templateId: 'acme/site/starter',
            version: '1.2.3',
            visibility: 'public',
            publisher: { businessId: 'business-1', userId: 'owner-1' },
            docs: {
              title: 'Starter Kit',
              description: 'starter',
            },
            uiSnapshot: {
              layers: '[]',
            },
            pluginBundles: [],
            publishedAt: '2026-02-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await flush();

    expect(container.textContent).toContain('Starter Kit');
    expect(container.textContent).toContain('acme/site/starter');
    expect(container.textContent).not.toContain('owner-2');
    expect(container.textContent).not.toContain('business-2::acme/site/starter');
  });

  it('uses cached preview to re-apply without waiting for another preview call', async () => {
    root.render(
      <TemplateInstallHistoryPanel
        businessId="business-1"
        actorUserId="owner-1"
        actorRole="owner"
        layers={[
          {
            id: 'page-home',
            name: 'Home',
            type: 'div',
            props: {},
            children: [],
          },
        ]}
        installs={[
          {
            id: 'business-1::acme/site/starter',
            businessId: 'business-1',
            templateId: 'acme/site/starter',
            version: '1.2.3',
            installedByUserId: 'owner-1',
            installedAt: '2026-02-24T00:00:00.000Z',
            mergeStrategy: 'best-effort',
            status: 'active',
            summary: {
              pagesAdded: 1,
              pagesMerged: 0,
              conflictsCount: 0,
              pluginsInstalled: 0,
              pluginsUpdated: 0,
            },
          },
        ]}
        releases={[
          {
            id: 'acme/site/starter@1.2.3',
            templateId: 'acme/site/starter',
            version: '1.2.3',
            visibility: 'public',
            publisher: { businessId: 'business-1', userId: 'owner-1' },
            docs: {
              title: 'Starter',
              description: 'starter',
            },
            uiSnapshot: {
              layers: '[]',
            },
            pluginBundles: [],
            publishedAt: '2026-02-24T00:00:00.000Z',
          },
        ]}
      />,
    );
    await flush();

    clickButton('Compare');
    await flush();
    expect(previewUiTemplateInstallMock).toHaveBeenCalledTimes(1);

    previewUiTemplateInstallMock.mockRejectedValueOnce(
      new Error('Preview should not be called during cached replay'),
    );

    clickButton('Re-apply');
    await flush();

    expect(installUiTemplateReleaseMock).toHaveBeenCalledTimes(1);
    expect(previewUiTemplateInstallMock).toHaveBeenCalledTimes(1);
  });
});

