import { describe, expect, it } from 'vitest';
import type { PluginDraftDoc } from '@/lib/plugins/types';
import {
  pickActiveDraftForPlugin,
  shouldTreatMissingActiveDraftAsTransient,
} from './-plugin-studio-draft-state';

function makeDraft(input: Partial<PluginDraftDoc> & Pick<PluginDraftDoc, 'draftId' | 'pluginId' | 'ownerUserId'>): PluginDraftDoc {
  return {
    id: input.id ?? input.draftId,
    draftId: input.draftId,
    pluginId: input.pluginId,
    ownerUserId: input.ownerUserId,
    collaboratorUserIds: input.collaboratorUserIds ?? [],
    status: input.status ?? 'active',
    title: input.title,
    createdAt: input.createdAt ?? '2026-02-19T10:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-02-19T10:00:00.000Z',
  } as PluginDraftDoc;
}

describe('plugin studio draft state helpers', () => {
  it('returns canonical draft when present', () => {
    const drafts = [
      makeDraft({
        draftId: 'draft.plugin.sales.user_a',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T09:00:00.000Z',
      }),
      makeDraft({
        draftId: 'draft.plugin.sales.user_a_legacy',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T11:00:00.000Z',
      }),
    ];

    const active = pickActiveDraftForPlugin({
      drafts,
      actorUserIdSet: new Set(['user/a']),
      pluginId: 'plugin.sales',
      canonicalDraftId: 'draft.plugin.sales.user_a',
    });

    expect(active?.draftId).toBe('draft.plugin.sales.user_a');
  });

  it('falls back to most recent eligible draft when canonical is missing', () => {
    const drafts = [
      makeDraft({
        draftId: 'draft.plugin.sales.user_a_older',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T09:00:00.000Z',
      }),
      makeDraft({
        draftId: 'draft.plugin.sales.user_a_newer',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T11:00:00.000Z',
      }),
    ];

    const active = pickActiveDraftForPlugin({
      drafts,
      actorUserIdSet: new Set(['user/a']),
      pluginId: 'plugin.sales',
      canonicalDraftId: 'draft.plugin.sales.user_a',
    });

    expect(active?.draftId).toBe('draft.plugin.sales.user_a_newer');
  });

  it('treats missing draft as transient when a draft was previously resolved', () => {
    expect(
      shouldTreatMissingActiveDraftAsTransient({
        hasResolvedDraftBefore: true,
        isDraftLoading: false,
        isDraftRevisionLoading: false,
      }),
    ).toBe(true);
  });
});
