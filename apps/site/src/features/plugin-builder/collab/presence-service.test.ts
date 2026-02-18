import { describe, expect, it } from 'vitest';
import {
  createCollaborationPresenceService,
  type PresenceCursorMetadata,
} from './presence-service';

const baseCursor: PresenceCursorMetadata = {
  anchorEntityId: 'field_customer_name',
  anchorPath: 'schemas.customer.fields.name',
  anchorOffset: 4,
};

describe('collaboration presence service', () => {
  it('tracks join, update, and leave semantics per draft', () => {
    const service = createCollaborationPresenceService({
      ttlMs: 5_000,
      now: () => Date.now(),
    });

    const joined = service.join({
      draftId: 'draft-1',
      userId: 'user-1',
      sessionId: 'session-1',
      activeTab: 'schemas',
      selectedEntityId: 'field_customer_name',
      cursor: baseCursor,
    });

    expect(joined.userId).toBe('user-1');
    expect(joined.sessionId).toBe('session-1');
    expect(joined.activeTab).toBe('schemas');
    expect(joined.selectedEntityId).toBe('field_customer_name');
    expect(joined.cursor).toEqual(baseCursor);

    const updated = service.update({
      draftId: 'draft-1',
      sessionId: 'session-1',
      activeTab: 'review',
      selectedEntityId: 'schema_customer',
      cursor: {
        anchorEntityId: 'schema_customer',
        anchorPath: 'schemas.customer',
      },
    });

    expect(updated.activeTab).toBe('review');
    expect(updated.selectedEntityId).toBe('schema_customer');
    expect(updated.cursor.anchorPath).toBe('schemas.customer');

    expect(service.list('draft-1')).toHaveLength(1);
    service.leave({ draftId: 'draft-1', sessionId: 'session-1' });
    expect(service.list('draft-1')).toHaveLength(0);
  });

  it('evicts stale sessions by ttl', () => {
    let nowMs = 1_000;
    const service = createCollaborationPresenceService({
      ttlMs: 500,
      now: () => nowMs,
    });

    service.join({
      draftId: 'draft-1',
      userId: 'user-1',
      sessionId: 'session-1',
      activeTab: 'schemas',
      selectedEntityId: 'field_customer_name',
    });

    nowMs = 1_400;
    expect(service.list('draft-1')).toHaveLength(1);

    nowMs = 1_600;
    expect(service.evictStale()).toBe(1);
    expect(service.list('draft-1')).toHaveLength(0);
  });

  it('fails updates for unknown sessions', () => {
    const service = createCollaborationPresenceService();

    expect(() =>
      service.update({
        draftId: 'draft-unknown',
        sessionId: 'session-missing',
        activeTab: 'schemas',
      }),
    ).toThrow(/unknown presence session/i);
  });
});
