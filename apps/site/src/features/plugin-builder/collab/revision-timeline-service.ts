import type { PluginBuildDiagnostic } from '../domain/validation/diagnostics-contract';

export type RevisionReviewStatus =
  | 'not-required'
  | 'required-pending'
  | 'required-approved';

export type RevisionPublishBlockingReason = 'review-approval-required';

export interface RecordRevisionPromotionInput {
  revisionId: string;
  actorId: string;
  summary: string;
  diagnostics: readonly PluginBuildDiagnostic[];
  reviewRequired: boolean;
  promotedAt?: string;
}

export interface TransitionRevisionReviewStatusInput {
  revisionId: string;
  actorId: string;
  toStatus: RevisionReviewStatus;
  changedAt?: string;
  note?: string;
}

export interface RevisionTimelineRecord {
  revisionId: string;
  actorId: string;
  summary: string;
  diagnosticsSnapshot: PluginBuildDiagnostic[];
  reviewRequired: boolean;
  reviewStatus: RevisionReviewStatus;
  promotedAt: string;
}

export interface RevisionStatusTransitionRecord {
  revisionId: string;
  fromStatus: RevisionReviewStatus | null;
  toStatus: RevisionReviewStatus;
  actorId: string;
  changedAt: string;
  note?: string;
}

export interface RevisionPublishReadiness {
  revisionId: string;
  reviewRequired: boolean;
  reviewStatus: RevisionReviewStatus;
  canPublish: boolean;
  blockingReason?: RevisionPublishBlockingReason;
}

function requireNonEmpty(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function cloneDiagnostics(
  diagnostics: readonly PluginBuildDiagnostic[],
): PluginBuildDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    path: [...diagnostic.path],
  }));
}

function cloneTimelineRecord(
  record: RevisionTimelineRecord,
): RevisionTimelineRecord {
  return {
    ...record,
    diagnosticsSnapshot: cloneDiagnostics(record.diagnosticsSnapshot),
  };
}

function cloneStatusTransition(
  transition: RevisionStatusTransitionRecord,
): RevisionStatusTransitionRecord {
  return {
    ...transition,
  };
}

function assertAllowedReviewStatusTransition(
  record: RevisionTimelineRecord,
  toStatus: RevisionReviewStatus,
): void {
  if (!record.reviewRequired) {
    throw new Error(`Revision ${record.revisionId} does not require review`);
  }

  if (toStatus === 'not-required') {
    throw new Error(
      'Review-required revisions cannot transition to not-required',
    );
  }

  if (record.reviewStatus === toStatus) {
    throw new Error(
      `Revision ${record.revisionId} is already in status ${record.reviewStatus}`,
    );
  }
}

export function createRevisionTimelineService() {
  const revisionsById = new Map<string, RevisionTimelineRecord>();
  const timeline: RevisionTimelineRecord[] = [];
  const transitionsByRevisionId = new Map<
    string,
    RevisionStatusTransitionRecord[]
  >();

  function getTransitionsForRevision(
    revisionId: string,
  ): RevisionStatusTransitionRecord[] {
    const existing = transitionsByRevisionId.get(revisionId);
    if (existing) {
      return existing;
    }

    const created: RevisionStatusTransitionRecord[] = [];
    transitionsByRevisionId.set(revisionId, created);
    return created;
  }

  function requireRevision(revisionId: string): RevisionTimelineRecord {
    const normalizedRevisionId = requireNonEmpty(revisionId, 'revisionId');
    const existing = revisionsById.get(normalizedRevisionId);
    if (!existing) {
      throw new Error(`Unknown revision: ${normalizedRevisionId}`);
    }

    return existing;
  }

  function appendTransition(transition: RevisionStatusTransitionRecord): void {
    const transitions = getTransitionsForRevision(transition.revisionId);
    transitions.push(transition);
  }

  return {
    recordPromotion(
      input: RecordRevisionPromotionInput,
    ): RevisionTimelineRecord {
      const revisionId = requireNonEmpty(input.revisionId, 'revisionId');
      if (revisionsById.has(revisionId)) {
        throw new Error(`Revision already exists: ${revisionId}`);
      }

      const actorId = requireNonEmpty(input.actorId, 'actorId');
      const summary = requireNonEmpty(input.summary, 'summary');

      const reviewStatus: RevisionReviewStatus = input.reviewRequired
        ? 'required-pending'
        : 'not-required';

      const record: RevisionTimelineRecord = {
        revisionId,
        actorId,
        summary,
        diagnosticsSnapshot: cloneDiagnostics(input.diagnostics),
        reviewRequired: input.reviewRequired,
        reviewStatus,
        promotedAt: input.promotedAt ?? new Date().toISOString(),
      };

      revisionsById.set(revisionId, record);
      timeline.push(record);

      appendTransition({
        revisionId,
        fromStatus: null,
        toStatus: reviewStatus,
        actorId,
        changedAt: record.promotedAt,
      });

      return cloneTimelineRecord(record);
    },

    transitionReviewStatus(
      input: TransitionRevisionReviewStatusInput,
    ): RevisionStatusTransitionRecord {
      const revision = requireRevision(input.revisionId);
      const actorId = requireNonEmpty(input.actorId, 'actorId');

      assertAllowedReviewStatusTransition(revision, input.toStatus);

      const transition: RevisionStatusTransitionRecord = {
        revisionId: revision.revisionId,
        fromStatus: revision.reviewStatus,
        toStatus: input.toStatus,
        actorId,
        changedAt: input.changedAt ?? new Date().toISOString(),
        note: input.note?.trim() || undefined,
      };

      revision.reviewStatus = input.toStatus;
      appendTransition(transition);

      return cloneStatusTransition(transition);
    },

    getPublishReadiness(revisionId: string): RevisionPublishReadiness {
      const revision = requireRevision(revisionId);
      if (!revision.reviewRequired) {
        return {
          revisionId: revision.revisionId,
          reviewRequired: revision.reviewRequired,
          reviewStatus: revision.reviewStatus,
          canPublish: true,
        };
      }

      const isApproved = revision.reviewStatus === 'required-approved';

      return {
        revisionId: revision.revisionId,
        reviewRequired: revision.reviewRequired,
        reviewStatus: revision.reviewStatus,
        canPublish: isApproved,
        blockingReason: isApproved ? undefined : 'review-approval-required',
      };
    },

    listTimeline(): RevisionTimelineRecord[] {
      return timeline.map((record) => cloneTimelineRecord(record));
    },

    listStatusTransitions(
      revisionId: string,
    ): RevisionStatusTransitionRecord[] {
      const normalizedRevisionId = requireNonEmpty(revisionId, 'revisionId');
      const transitions = transitionsByRevisionId.get(normalizedRevisionId);
      return (transitions ?? []).map((transition) =>
        cloneStatusTransition(transition),
      );
    },
  };
}
