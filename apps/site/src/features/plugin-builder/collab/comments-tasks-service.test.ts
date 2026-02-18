import { describe, expect, it } from 'vitest';
import { createWorkspaceEntityMap } from '../domain/workspace/workspace-entities';
import { createCommentsTasksService } from './comments-tasks-service';

function createEntityMap() {
  return createWorkspaceEntityMap({
    schemas: [
      {
        id: 'schema_customer',
        schemaId: 'customer',
        fieldIds: ['field_customer_name'],
        refinementIds: [],
      },
    ],
    fields: [
      {
        id: 'field_customer_name',
        schemaId: 'schema_customer',
        key: 'name',
        type: 'string',
        derivationIds: [],
        refinementIds: [],
      },
    ],
    derivations: [],
    refinements: [],
    workflows: [],
    nodes: [],
    edges: [],
    actions: [],
    tabs: [],
  });
}

describe('comments tasks service', () => {
  it('supports create, assign, resolve, and reopen lifecycle', () => {
    const service = createCommentsTasksService({
      entityMap: createEntityMap(),
      participants: [
        { userId: 'owner-1', role: 'owner' },
        { userId: 'editor-1', role: 'editor' },
        { userId: 'commenter-1', role: 'commenter' },
      ],
    });

    const created = service.createTask({
      taskId: 'task-1',
      entityId: 'field_customer_name',
      actorId: 'commenter-1',
      body: 'Please tighten validation copy',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(created.status).toBe('open');
    expect(created.assigneeId).toBeUndefined();

    const assigned = service.assignTask({
      taskId: 'task-1',
      actorId: 'editor-1',
      assigneeId: 'commenter-1',
    });

    expect(assigned.assigneeId).toBe('commenter-1');

    const resolved = service.resolveTask({
      taskId: 'task-1',
      actorId: 'commenter-1',
      resolvedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedBy).toBe('commenter-1');

    const reopened = service.reopenTask({
      taskId: 'task-1',
      actorId: 'owner-1',
      reopenedAt: '2026-01-03T00:00:00.000Z',
    });

    expect(reopened.status).toBe('open');
    expect(reopened.reopenedBy).toBe('owner-1');
    expect(service.getTask('task-1')).toEqual(reopened);
  });

  it('rejects create when entity reference is unknown', () => {
    const service = createCommentsTasksService({
      entityMap: createEntityMap(),
      participants: [{ userId: 'owner-1', role: 'owner' }],
    });

    expect(() =>
      service.createTask({
        taskId: 'task-1',
        entityId: 'field_missing',
        actorId: 'owner-1',
        body: 'Missing reference',
      }),
    ).toThrow(/unknown entity/i);
  });

  it('enforces permission checks for assign and resolve actions', () => {
    const service = createCommentsTasksService({
      entityMap: createEntityMap(),
      participants: [
        { userId: 'owner-1', role: 'owner' },
        { userId: 'viewer-1', role: 'viewer' },
      ],
    });

    service.createTask({
      taskId: 'task-1',
      entityId: 'field_customer_name',
      actorId: 'owner-1',
      body: 'Assign someone',
    });

    expect(() =>
      service.assignTask({
        taskId: 'task-1',
        actorId: 'viewer-1',
        assigneeId: 'owner-1',
      }),
    ).toThrow(/permission/i);

    expect(() =>
      service.resolveTask({
        taskId: 'task-1',
        actorId: 'viewer-1',
      }),
    ).toThrow(/permission/i);
  });

  it('fails when reopening a task that is already open', () => {
    const service = createCommentsTasksService({
      entityMap: createEntityMap(),
      participants: [{ userId: 'owner-1', role: 'owner' }],
    });

    service.createTask({
      taskId: 'task-1',
      entityId: 'field_customer_name',
      actorId: 'owner-1',
      body: 'Initial note',
    });

    expect(() =>
      service.reopenTask({
        taskId: 'task-1',
        actorId: 'owner-1',
      }),
    ).toThrow(/already open/i);
  });
});
