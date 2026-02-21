import { describe, expect, it } from 'vitest';
import type { PluginDraftDoc } from '@/lib/plugins/types';
import {
  pickActiveDraftForPlugin,
  shouldTreatMissingActiveDraftAsTransient,
} from './-plugin-studio-draft-state';

function makeDraft(
  input: Partial<PluginDraftDoc> &
    Pick<PluginDraftDoc, 'draftId' | 'pluginId' | 'ownerUserId' | 'projectId'>,
): PluginDraftDoc {
  return {
    id: input.id ?? input.draftId,
    draftId: input.draftId,
    pluginId: input.pluginId,
    projectId: input.projectId,
    ownerUserId: input.ownerUserId,
    collaboratorUserIds: input.collaboratorUserIds ?? [],
    status: input.status ?? 'active',
    title: input.title,
    createdAt: input.createdAt ?? '2026-02-19T10:00:00.000Z',
    updatedAt: input.updatedAt ?? '2026-02-19T10:00:00.000Z',
  } as PluginDraftDoc;
}

describe('plugin studio draft state helpers', () => {
  it('returns canonical draft when present in the same project', () => {
    const drafts = [
      makeDraft({
        draftId: 'draft.project_a.plugin.sales',
        projectId: 'project_a',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T09:00:00.000Z',
      }),
      makeDraft({
        draftId: 'draft.project_b.plugin.sales',
        projectId: 'project_b',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T11:00:00.000Z',
      }),
    ];

    const active = pickActiveDraftForPlugin({
      drafts,
      actorUserIdSet: new Set(['user/a']),
      projectId: 'project_a',
      pluginId: 'plugin.sales',
      canonicalDraftId: 'draft.project_a.plugin.sales',
    });

    expect(active?.draftId).toBe('draft.project_a.plugin.sales');
  });

  it('falls back to most recent eligible draft in the selected project when canonical is missing', () => {
    const drafts = [
      makeDraft({
        draftId: 'draft.project_a.plugin.sales.older',
        projectId: 'project_a',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T09:00:00.000Z',
      }),
      makeDraft({
        draftId: 'draft.project_a.plugin.sales.newer',
        projectId: 'project_a',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T11:00:00.000Z',
      }),
      makeDraft({
        draftId: 'draft.project_b.plugin.sales.newest',
        projectId: 'project_b',
        pluginId: 'plugin.sales',
        ownerUserId: 'user/a',
        updatedAt: '2026-02-19T12:00:00.000Z',
      }),
    ];

    const active = pickActiveDraftForPlugin({
      drafts,
      actorUserIdSet: new Set(['user/a']),
      projectId: 'project_a',
      pluginId: 'plugin.sales',
      canonicalDraftId: 'draft.project_a.plugin.sales',
    });

    expect(active?.draftId).toBe('draft.project_a.plugin.sales.newer');
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
