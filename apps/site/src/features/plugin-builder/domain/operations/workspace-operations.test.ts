import { describe, expect, it } from 'vitest';
import {
  decodeWorkspaceOperation,
  parseWorkspaceOperation,
  WORKSPACE_OPERATION_KINDS,
  WorkspaceOperationParseError,
} from './workspace-operations';

describe('workspace operations', () => {
  it('defines all mutable workspace operation kinds', () => {
    expect(WORKSPACE_OPERATION_KINDS).toEqual([
      'create',
      'update',
      'delete',
      'move',
      'link',
      'unlink',
      'comment',
      'review-state',
    ]);
  });

  it('parses a valid operation with required metadata', () => {
    const parsed = parseWorkspaceOperation({
      operationId: 'op-1',
      type: 'create',
      actor: { userId: 'user-1', sessionId: 'session-1' },
      logicalTimestamp: 12,
      recordedAt: '2026-01-01T00:00:00.000Z',
      targetPath: ['schemas', 'customer'],
      value: { id: 'customer', fields: [] },
    });

    expect(parsed.type).toBe('create');
    expect(parsed.actor.userId).toBe('user-1');
    expect(parsed.logicalTimestamp).toBe(12);
    expect(parsed.targetPath).toEqual(['schemas', 'customer']);
  });

  it('throws when metadata is malformed', () => {
    expect(() =>
      parseWorkspaceOperation({
        operationId: 'op-2',
        type: 'update',
        actor: { userId: '' },
        logicalTimestamp: -1,
        recordedAt: 'invalid',
        targetPath: [],
        patch: { name: 'Customer' },
      }),
    ).toThrowError(WorkspaceOperationParseError);
  });

  it('decodes legacy events into current operation contract', () => {
    const decoded = decodeWorkspaceOperation({
      id: 'legacy-op-1',
      kind: 'review-state',
      actorId: 'reviewer-1',
      ts: 44,
      at: '2026-01-02T10:00:00.000Z',
      path: 'reviews/checklist',
      state: 'approved',
      note: 'Looks good',
    });

    expect(decoded).toEqual({
      operationId: 'legacy-op-1',
      type: 'review-state',
      actor: { userId: 'reviewer-1' },
      logicalTimestamp: 44,
      recordedAt: '2026-01-02T10:00:00.000Z',
      targetPath: ['reviews', 'checklist'],
      reviewState: 'approved',
      note: 'Looks good',
    });
  });
});
