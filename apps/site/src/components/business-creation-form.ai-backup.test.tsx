// @vitest-environment jsdom

import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import {
  BusinessCreationForm,
  type BusinessCreationValues,
} from './business-creation-form';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/api', () => ({
  api: {
    pluginRelease: { useGet: () => ({ data: [] }) },
  },
}));

vi.mock('@/server-functions/ai-proxy', () => ({
  testBoyaiConnection: vi
    .fn()
    .mockResolvedValue({ success: true, text: 'OK' }),
}));

vi.mock('@/lib/plugins/admin-plugin-catalog', () => ({
  buildPluginCatalog: () => ({ items: [] }),
}));

vi.mock('@/lib/plugins/admin-plugin-market', () => ({
  buildMarketplaceGroups: () => ({
    all: [],
    topInstalled: [],
    recentlyUpdated: [],
  }),
  buildPluginDetailView: () => ({}),
}));

vi.mock('@/lib/plugins/marketplace-seed', () => ({
  mergeMarketplaceReleasesWithSeed: () => [],
  parseReleaseId: () => null,
}));

vi.mock('@/components/plugins/plugin-details-view', () => ({
  PluginDetailsView: () => <div />,
}));

vi.mock('@/components/plugins/plugin-icon', () => ({
  PluginIcon: () => <div />,
}));

vi.mock('@/components/ui/autoform/components/MapField', () => ({
  MapField: () => <div />,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// ---------------------------------------------------------------------------
// VercelV0Chat stub — stores the latest wizard callbacks so tests can drive
// the wizard through its stages programmatically.
// ---------------------------------------------------------------------------

type WizardOption = { id: string; label: string };
type WizardInput = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};
type WizardProps = {
  stageKey: string;
  options?: WizardOption[];
  input?: WizardInput;
  onSelectOption: (id: string) => void;
};

let latestWizard: WizardProps | null = null;

vi.mock('@/components/ui/v0-ai-chat', () => ({
  VercelV0Chat: ({ wizard }: { wizard: WizardProps }) => {
    latestWizard = wizard;
    return <div data-testid="v0-chat" data-stage={wizard?.stageKey} />;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// BusinessOnboardingAssistantForm aliases its form prop as _form (unused at
// step 2), so we can safely pass an empty cast object.
const mockForm = {} as UseFormReturn<BusinessCreationValues>;

function renderStep2(
  container: HTMLDivElement,
  saveProviderCredentialRef?: { current: (() => Promise<void>) | null },
): Root {
  const root = createRoot(container);
  root.render(
    <BusinessCreationForm
      step={2}
      form={mockForm}
      setStep={vi.fn()}
      createdBusiness={undefined}
      isSubmitting={false}
      saveProviderCredentialRef={saveProviderCredentialRef}
    />,
  );
  return root;
}

function flush(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function waitFor(
  assertion: () => void,
  maxMs = 1500,
): Promise<void> {
  const start = Date.now();
  while (true) {
    try {
      assertion();
      return;
    } catch {
      if (Date.now() - start > maxMs) {
        assertion();
        return;
      }
      await flush();
    }
  }
}

// Advance wizard: provider → model → auth(api-key) → credential → done
async function advanceWizardToDone() {
  await flush();
  latestWizard?.onSelectOption('openai'); // provider
  await flush();
  latestWizard?.onSelectOption('gpt-4o'); // model
  await flush();
  latestWizard?.onSelectOption('api-key'); // auth
  await flush();
  latestWizard?.input?.onChange('sk-test-1234'); // type key
  await flush();
  latestWizard?.input?.onSubmit(); // submit → done stage
  await flush();
}

function clickButton(container: HTMLDivElement, text: string): void {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  );
  if (!btn) throw new Error(`Button "${text}" not found`);
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BusinessCreationForm step 2 — AI backup key flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    latestWizard = null;
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(async () => {
    root?.unmount();
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the wizard at provider stage on mount', async () => {
    root = renderStep2(container);
    await flush();

    await waitFor(() => {
      const stage = container
        .querySelector('[data-testid="v0-chat"]')
        ?.getAttribute('data-stage');
      expect(stage).toBe('provider');
    });
  });

  it('shows Add Another button when wizard reaches done stage', async () => {
    root = renderStep2(container);
    await advanceWizardToDone();

    await waitFor(() => {
      const btn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Another'),
      );
      expect(btn).toBeTruthy();
    });
  });

  it('Add Another calls fetch POST /v1/auth/providers and resets wizard to provider', async () => {
    root = renderStep2(container);
    await advanceWizardToDone();

    clickButton(container, 'Add Another');
    await flush();

    const fetchMock = vi.mocked(globalThis.fetch);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/auth/providers',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    await waitFor(() => {
      expect(latestWizard?.stageKey).toBe('provider');
    });
  });

  it('shows a green credential pill after Add Another completes', async () => {
    root = renderStep2(container);
    await advanceWizardToDone();

    clickButton(container, 'Add Another');
    await flush();

    await waitFor(() => {
      const pill = container.querySelector('.border-emerald-500\\/20');
      expect(pill).toBeTruthy();
      expect(pill?.textContent).toContain('api-key');
    });
  });

  it('saveProviderCredentialRef is a no-op when wizard has not reached done stage', async () => {
    const ref: { current: (() => Promise<void>) | null } = { current: null };
    root = renderStep2(container, ref);
    await flush();

    // At provider stage the ref should exist but be a no-op
    expect(ref.current).toBeTruthy();
    await ref.current?.();

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saveProviderCredentialRef triggers fetch when wizard is done and key is present', async () => {
    const ref: { current: (() => Promise<void>) | null } = { current: null };
    root = renderStep2(container, ref);
    await advanceWizardToDone();

    expect(ref.current).toBeTruthy();
    await ref.current?.();
    await flush();

    const fetchMock = vi.mocked(globalThis.fetch);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/v1/auth/providers',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
