import type { PluginDraftDoc } from '@/lib/plugins/types';

type PickActiveDraftArgs = {
  drafts: readonly PluginDraftDoc[];
  actorUserIdSet: ReadonlySet<string>;
  projectId: string;
  pluginId: string;
  canonicalDraftId: string;
};

function toDraftRecencyKey(draft: PluginDraftDoc) {
  return `${draft.updatedAt ?? ''}:${draft.createdAt ?? ''}:${draft.draftId}`;
}

export function pickActiveDraftForPlugin({
  drafts,
  actorUserIdSet,
  projectId,
  pluginId,
  canonicalDraftId,
}: PickActiveDraftArgs): PluginDraftDoc | null {
  const matchesActorUserId = (candidate: string | undefined) =>
    Boolean(candidate?.trim() && actorUserIdSet.has(candidate.trim()));

  const eligibleDrafts = drafts.filter(
    (draft) =>
      draft.projectId === projectId &&
      draft.pluginId === pluginId &&
      (matchesActorUserId(draft.ownerUserId) ||
        (draft.collaboratorUserIds ?? []).some((candidate) =>
          matchesActorUserId(candidate),
        )),
  );

  if (eligibleDrafts.length === 0) return null;

  const canonicalDraft = eligibleDrafts.find(
    (draft) => draft.draftId === canonicalDraftId,
  );
  if (canonicalDraft) {
    return canonicalDraft;
  }

  return [...eligibleDrafts].sort((left, right) =>
    toDraftRecencyKey(right).localeCompare(toDraftRecencyKey(left)),
  )[0]!;
}

export function shouldTreatMissingActiveDraftAsTransient({
  hasResolvedDraftBefore,
  isDraftLoading,
  isDraftRevisionLoading,
}: {
  hasResolvedDraftBefore: boolean;
  isDraftLoading: boolean;
  isDraftRevisionLoading: boolean;
}) {
  if (isDraftLoading || isDraftRevisionLoading) return false;
  return hasResolvedDraftBefore;
}
