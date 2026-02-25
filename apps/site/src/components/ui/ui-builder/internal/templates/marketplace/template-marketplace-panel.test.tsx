// @vitest-environment jsdom

import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  BusinessUiTemplateInstallDoc,
  UiTemplateReleaseDoc,
} from '@/lib/plugins/types';
import { TemplateMarketplacePanel } from './template-marketplace-panel';

let container: HTMLDivElement;
let root: Root;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function clickByText(text: string) {
  const button = [...container.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.trim().includes(text),
  );
  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }
  button.click();
}

function setInputValue(testId: string, value: string) {
  const input = container.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLInputElement | null;
  if (!input) {
    throw new Error(`Input not found: ${testId}`);
  }
  const inputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  inputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function sampleRelease(
  templateId: string,
  version: string,
  publishedAt: string,
  docs: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
  },
): UiTemplateReleaseDoc {
  return {
    id: `${templateId}@${version}`,
    templateId,
    version,
    visibility: 'public',
    publisher: {
      businessId: 'biz-seed',
      userId: 'user-seed',
    },
    docs,
    uiSnapshot: {
      layers: JSON.stringify([{ id: 'root', name: 'Home' }]),
    },
    pluginBundles: [],
    publishedAt,
  };
}

describe('TemplateMarketplacePanel', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it('filters by category/tag/install-state/query', async () => {
    const templateReleases: UiTemplateReleaseDoc[] = [
      sampleRelease('acme/starter', '1.2.0', '2026-02-20T10:00:00.000Z', {
        title: 'Starter',
        description: 'Starter shell',
        category: 'restaurant',
        tags: ['starter', 'food'],
      }),
      sampleRelease('acme/modern', '1.0.0', '2026-02-18T10:00:00.000Z', {
        title: 'Modern Shop',
        description: 'Retail shell',
        category: 'retail',
        tags: ['commerce'],
      }),
      sampleRelease('acme/bistro', '1.0.0', '2026-02-17T10:00:00.000Z', {
        title: 'Bistro',
        description: 'Restaurant shell',
        category: 'restaurant',
        tags: ['food'],
      }),
    ];

    const installedTemplates: BusinessUiTemplateInstallDoc[] = [
      {
        id: 'install-1',
        businessId: 'biz-1',
        templateId: 'acme/starter',
        version: '1.0.0',
        installedByUserId: 'owner-1',
        installedAt: '2026-02-21T10:00:00.000Z',
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
    ];

    root.render(
      <TemplateMarketplacePanel
        templateReleases={templateReleases}
        installedTemplates={installedTemplates}
      />,
    );
    await flush();

    expect(container.querySelectorAll('[data-template-card="true"]').length).toBe(3);

    clickByText('restaurant');
    await flush();
    expect(container.querySelectorAll('[data-template-card="true"]').length).toBe(2);

    clickByText('#food');
    await flush();
    expect(container.querySelectorAll('[data-template-card="true"]').length).toBe(2);

    clickByText('Installed');
    await flush();
    expect(container.querySelectorAll('[data-template-card="true"]').length).toBe(1);
    expect(container.textContent).toContain('installed 1.0.0');

    clickByText('All');
    await flush();
    clickByText('All categories');
    await flush();
    clickByText('All tags');
    await flush();
    setInputValue('template-marketplace-query', 'modern');
    await flush();
    expect(container.querySelectorAll('[data-template-card="true"]').length).toBe(1);
    expect(container.textContent).toContain('Modern Shop');
  });

  it('applies deterministic installed-first grouping and stable sort tie-breakers', async () => {
    const templateReleases: UiTemplateReleaseDoc[] = [
      sampleRelease('acme/zzz', '1.0.0', '2026-02-20T10:00:00.000Z', {
        title: 'Starter',
        description: 'Same timestamp',
        category: 'restaurant',
        tags: ['starter'],
      }),
      sampleRelease('acme/aaa', '1.0.0', '2026-02-20T10:00:00.000Z', {
        title: 'Starter',
        description: 'Same timestamp',
        category: 'restaurant',
        tags: ['starter'],
      }),
      sampleRelease('acme/installed', '1.0.0', '2026-01-01T10:00:00.000Z', {
        title: 'Installed Template',
        description: 'Older, but grouped first',
        category: 'restaurant',
        tags: ['starter'],
      }),
    ];

    const installedTemplates: BusinessUiTemplateInstallDoc[] = [
      {
        id: 'install-1',
        businessId: 'biz-1',
        templateId: 'acme/installed',
        version: '1.0.0',
        installedByUserId: 'owner-1',
        installedAt: '2026-02-21T10:00:00.000Z',
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
    ];

    root.render(
      <TemplateMarketplacePanel
        templateReleases={templateReleases}
        installedTemplates={installedTemplates}
      />,
    );
    await flush();

    const installedGroup = container.querySelector('[data-testid="template-group-installed"]');
    const availableGroup = container.querySelector('[data-testid="template-group-available"]');

    expect(installedGroup).toBeTruthy();
    expect(availableGroup).toBeTruthy();

    const installedTitles = [...
      (installedGroup?.querySelectorAll('[data-template-card-title="true"]') ?? [])
    ].map((node) => node.textContent?.trim());

    const availableTemplateIds = [...
      (availableGroup?.querySelectorAll('[data-template-card="true"] p.text-xs') ?? [])
    ].map((node) => node.textContent?.trim());

    expect(installedTitles).toEqual(['Installed Template']);
    expect(availableTemplateIds).toEqual(['acme/aaa', 'acme/zzz']);
  });

  it('supports latest toggle and pinned-version selection callbacks', async () => {
    const templateReleases: UiTemplateReleaseDoc[] = [
      sampleRelease('acme/starter', '1.2.0', '2026-02-20T10:00:00.000Z', {
        title: 'Starter',
        description: 'Latest release',
        category: 'restaurant',
        tags: ['starter'],
      }),
      sampleRelease('acme/starter', '1.1.0', '2026-02-19T10:00:00.000Z', {
        title: 'Starter',
        description: 'Pinned release',
        category: 'restaurant',
        tags: ['starter'],
      }),
    ];

    const onSelectionChange = vi.fn();

    root.render(
      <TemplateMarketplacePanel
        templateReleases={templateReleases}
        installedTemplates={[]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await flush();

    clickByText('Starter');
    await flush();

    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'acme/starter',
        preferLatestVersion: true,
        resolvedVersion: '1.2.0',
      }),
    );

    const latestToggle = container.querySelector(
      '[data-testid="template-version-latest-toggle"]',
    ) as HTMLInputElement | null;
    if (!latestToggle) {
      throw new Error('Latest toggle not found');
    }
    latestToggle.click();
    await flush();

    const select = container.querySelector(
      '[data-testid="template-version-select"]',
    ) as HTMLSelectElement | null;
    if (!select) {
      throw new Error('Version select not found');
    }
    select.value = '1.1.0';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const lastCall = onSelectionChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({
      templateId: 'acme/starter',
      preferLatestVersion: false,
      selectedVersion: '1.1.0',
      resolvedVersion: '1.1.0',
    });
  });
});
