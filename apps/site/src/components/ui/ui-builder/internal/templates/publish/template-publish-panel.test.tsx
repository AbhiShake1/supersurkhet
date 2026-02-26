// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/keyboard-shortcuts', () => ({
  ShortcutKbd: () => <span>kbd</span>,
  useShortcutAction: () => {},
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    list,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    list?: string;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      list={list}
      onInput={(event) =>
        onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)
      }
    />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

import { TemplatePublishPanel } from './template-publish-panel';

let container: HTMLDivElement;
let root: Root;

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TemplatePublishPanel', () => {
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

  it('autofills slug from title until slug is manually overridden', async () => {
    root.render(
      <TemplatePublishPanel
        businessId="biz-1"
        layers={[{ id: 'home', type: 'page', props: {}, children: [] }]}
        availableCategories={[]}
        isPublishLoading={false}
        publishedRef=""
        publishShortcut={{
          id: 'uiBuilder.templates.publishTemplate',
          label: 'Publish template',
          description: 'Publish current builder state as a template release.',
          scope: 'UI Builder Templates',
          defaultBinding: {
            key: 'Enter',
            ctrl: false,
            meta: true,
            alt: true,
            shift: false,
          },
        }}
        isActive
        onPublish={() => {}}
        onOpenPublishedTemplate={() => {}}
      />,
    );
    await flush();
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const slugInput = container.querySelector(
      'input[placeholder="Template slug (e.g. starter)"]',
    ) as HTMLInputElement;
    const titleInput = container.querySelector(
      'input[placeholder="Template title"]',
    ) as HTMLInputElement;

    titleInput.value = 'My Starter Template';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(slugInput.value).toBe('my-starter-template');

    slugInput.value = 'custom slug';
    slugInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(slugInput.value).toBe('custom-slug');

    titleInput.value = 'Another Title';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();

    expect(slugInput.value).toBe('custom-slug');
  });

  it('renders post-publish quick actions when a reference is available', async () => {
    root.render(
      <TemplatePublishPanel
        businessId="biz-2"
        layers={[{ id: 'home', type: 'page', props: {}, children: [] }]}
        availableCategories={['restaurant']}
        isPublishLoading={false}
        publishedRef="acme/site/starter@1.0.0"
        publishShortcut={{
          id: 'uiBuilder.templates.publishTemplate',
          label: 'Publish template',
          description: 'Publish current builder state as a template release.',
          scope: 'UI Builder Templates',
          defaultBinding: {
            key: 'Enter',
            ctrl: false,
            meta: true,
            alt: true,
            shift: false,
          },
        }}
        isActive
        onPublish={() => {}}
        onOpenPublishedTemplate={() => {}}
      />,
    );
    await flush();
    expect(container.textContent).toContain('Copy Reference');
    expect(container.textContent).toContain('Open in Marketplace');
  });

  it('disables publish when guardrails are failing', async () => {
    root.render(
      <TemplatePublishPanel
        businessId="biz-3"
        layers={[]}
        availableCategories={[]}
        isPublishLoading={false}
        publishedRef=""
        publishShortcut={{
          id: 'uiBuilder.templates.publishTemplate',
          label: 'Publish template',
          description: 'Publish current builder state as a template release.',
          scope: 'UI Builder Templates',
          defaultBinding: {
            key: 'Enter',
            ctrl: false,
            meta: true,
            alt: true,
            shift: false,
          },
        }}
        isActive
        onPublish={() => {}}
        onOpenPublishedTemplate={() => {}}
      />,
    );
    await flush();

    const publishButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Publish Template'),
    );

    expect(publishButton).toBeTruthy();
    expect(publishButton?.getAttribute('disabled')).not.toBeNull();
    expect(container.textContent).toContain(
      'Add at least one page before publishing a template.',
    );
  });
});
