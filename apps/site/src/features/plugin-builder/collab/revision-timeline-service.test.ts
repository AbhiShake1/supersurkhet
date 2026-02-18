import { describe, expect, it } from 'vitest';
import type { PluginBuildDiagnostic } from '../domain/validation/diagnostics-contract';
import { createRevisionTimelineService } from './revision-timeline-service';

function createDiagnostic(
  code: string,
  severity: PluginBuildDiagnostic['severity'] = 'warning',
): PluginBuildDiagnostic {
  return {
    code,
    severity,
    path: ['workflows', 'checkout'],
    message: `${code} message`,
  };
}

describe('revision timeline service', () => {
  it('records promotion history with immutable diagnostics snapshots and review-required metadata', () => {
    const service = createRevisionTimelineService();
    const diagnostics = [createDiagnostic('missing-capability')];

    const promoted = service.recordPromotion({
      revisionId: 'rev-1',
      actorId: 'alice',
      summary: 'Promote checkout workflow updates',
      diagnostics,
      reviewRequired: true,
      promotedAt: '2026-02-01T00:00:00.000Z',
    });

    diagnostics.push(createDiagnostic('disconnected-node'));

    expect(promoted.reviewRequired).toBe(true);
    expect(promoted.reviewStatus).toBe('required-pending');
    expect(promoted.diagnosticsSnapshot).toEqual([
      createDiagnostic('missing-capability'),
    ]);

    const second = service.recordPromotion({
      revisionId: 'rev-2',
      actorId: 'bob',
      summary: 'Promote docs-only fixes',
      diagnostics: [],
      reviewRequired: false,
      promotedAt: '2026-02-02T00:00:00.000Z',
    });

    expect(second.reviewStatus).toBe('not-required');
    expect(service.listTimeline()).toEqual([promoted, second]);
  });

  it('tracks append-only review transitions and opens publish gate after approval', () => {
    const service = createRevisionTimelineService();

    service.recordPromotion({
      revisionId: 'rev-1',
      actorId: 'alice',
      summary: 'Promote payment pipeline changes',
      diagnostics: [createDiagnostic('missing-capability')],
      reviewRequired: true,
      promotedAt: '2026-02-03T00:00:00.000Z',
    });

    expect(service.getPublishReadiness('rev-1')).toEqual({
      revisionId: 'rev-1',
      reviewRequired: true,
      reviewStatus: 'required-pending',
      canPublish: false,
      blockingReason: 'review-approval-required',
    });

    const approved = service.transitionReviewStatus({
      revisionId: 'rev-1',
      actorId: 'reviewer-1',
      toStatus: 'required-approved',
      changedAt: '2026-02-03T01:00:00.000Z',
      note: 'Looks good for release',
    });

    expect(approved.toStatus).toBe('required-approved');

    expect(service.getPublishReadiness('rev-1')).toEqual({
      revisionId: 'rev-1',
      reviewRequired: true,
      reviewStatus: 'required-approved',
      canPublish: true,
    });

    expect(service.listStatusTransitions('rev-1')).toEqual([
      {
        revisionId: 'rev-1',
        fromStatus: null,
        toStatus: 'required-pending',
        actorId: 'alice',
        changedAt: '2026-02-03T00:00:00.000Z',
      },
      {
        revisionId: 'rev-1',
        fromStatus: 'required-pending',
        toStatus: 'required-approved',
        actorId: 'reviewer-1',
        changedAt: '2026-02-03T01:00:00.000Z',
        note: 'Looks good for release',
      },
    ]);
  });

  it('rejects review approval when revision does not require review', () => {
    const service = createRevisionTimelineService();

    service.recordPromotion({
      revisionId: 'rev-2',
      actorId: 'bob',
      summary: 'Promote typo fix',
      diagnostics: [],
      reviewRequired: false,
    });

    expect(() =>
      service.transitionReviewStatus({
        revisionId: 'rev-2',
        actorId: 'reviewer-1',
        toStatus: 'required-approved',
      }),
    ).toThrow(/does not require review/i);
  });
});
