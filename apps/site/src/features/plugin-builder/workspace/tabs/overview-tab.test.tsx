import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OverviewTab } from './overview-tab';

describe('OverviewTab', () => {
  it('renders plugin metadata, collaborators, active draft, and immutable revision summary', () => {
    const html = renderToStaticMarkup(
      <OverviewTab
        metadata={{
          pluginId: 'plugin_checkout',
          pluginName: 'Checkout Plugin',
          namespace: 'retail.checkout',
          status: 'published',
        }}
        collaborators={[
          {
            id: 'user_1',
            name: 'Asha',
            role: 'Owner',
            isActive: true,
          },
          {
            id: 'user_2',
            name: 'Kiran',
            role: 'Editor',
            isActive: false,
          },
        ]}
        activeDraft={{
          draftId: 'draft_123',
          updatedAt: '2026-02-18T10:30:00.000Z',
          updatedBy: 'Asha',
        }}
        latestImmutableRevision={{
          revisionId: 'rev_22',
          publishedAt: '2026-02-17T07:00:00.000Z',
          publishedBy: 'Kiran',
          note: 'Stable checkout workflow',
        }}
      />,
    );

    expect(html).toContain('Checkout Plugin');
    expect(html).toContain('plugin_checkout');
    expect(html).toContain('retail.checkout');
    expect(html).toContain('published');
    expect(html).toContain('Asha');
    expect(html).toContain('Owner');
    expect(html).toContain('Active');
    expect(html).toContain('draft_123');
    expect(html).toContain('2026-02-18T10:30:00.000Z');
    expect(html).toContain('rev_22');
    expect(html).toContain('Stable checkout workflow');
  });

  it('renders empty-state summaries when draft, revision, and collaborators are missing', () => {
    const html = renderToStaticMarkup(
      <OverviewTab
        metadata={{
          pluginId: 'plugin_inventory',
          pluginName: 'Inventory Plugin',
          namespace: 'retail.inventory',
          status: 'draft',
        }}
        collaborators={[]}
        activeDraft={null}
        latestImmutableRevision={null}
      />,
    );

    expect(html).toContain('Inventory Plugin');
    expect(html).toContain('No collaborators yet');
    expect(html).toContain('No active draft');
    expect(html).toContain('No immutable revision published yet');
  });
});
