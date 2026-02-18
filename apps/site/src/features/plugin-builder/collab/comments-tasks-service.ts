import type { WorkspaceEntityMap } from '../domain/workspace/workspace-entities';

export type CommentsTasksParticipantRole =
  | 'owner'
  | 'editor'
  | 'commenter'
  | 'viewer';

export type CommentsTaskStatus = 'open' | 'resolved';

export interface CommentsTasksParticipant {
  userId: string;
  role: CommentsTasksParticipantRole;
}

export interface CommentTask {
  taskId: string;
  entityId: string;
  body: string;
  status: CommentsTaskStatus;
  createdBy: string;
  assigneeId?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
}

export interface CreateCommentsTasksServiceInput {
  entityMap: WorkspaceEntityMap;
  participants: readonly CommentsTasksParticipant[];
}

export interface CreateTaskInput {
  taskId: string;
  entityId: string;
  actorId: string;
  body: string;
  assigneeId?: string;
  createdAt?: string;
}

export interface AssignTaskInput {
  taskId: string;
  actorId: string;
  assigneeId: string;
}

export interface ResolveTaskInput {
  taskId: string;
  actorId: string;
  resolvedAt?: string;
}

export interface ReopenTaskInput {
  taskId: string;
  actorId: string;
  reopenedAt?: string;
}

function requireNonEmptyString(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

function createEntityIdIndex(entityMap: WorkspaceEntityMap): Set<string> {
  return new Set<string>([
    ...Object.keys(entityMap.schemas),
    ...Object.keys(entityMap.fields),
    ...Object.keys(entityMap.derivations),
    ...Object.keys(entityMap.refinements),
    ...Object.keys(entityMap.workflows),
    ...Object.keys(entityMap.nodes),
    ...Object.keys(entityMap.edges),
    ...Object.keys(entityMap.actions),
    ...Object.keys(entityMap.tabs),
  ]);
}

function canCreateTask(role: CommentsTasksParticipantRole): boolean {
  return role === 'owner' || role === 'editor' || role === 'commenter';
}

function canAssignTask(role: CommentsTasksParticipantRole): boolean {
  return role === 'owner' || role === 'editor';
}

function canUpdateTaskState(
  role: CommentsTasksParticipantRole,
  actorId: string,
  task: CommentTask,
): boolean {
  if (role === 'owner' || role === 'editor') {
    return true;
  }
  return actorId === task.createdBy || actorId === task.assigneeId;
}

export function createCommentsTasksService(
  input: CreateCommentsTasksServiceInput,
) {
  const entityIds = createEntityIdIndex(input.entityMap);
  const participantsById = new Map<string, CommentsTasksParticipant>();
  const tasksById = new Map<string, CommentTask>();

  for (const participant of input.participants) {
    const userId = requireNonEmptyString(
      participant.userId,
      'participants.userId',
    );
    if (participantsById.has(userId)) {
      throw new Error(`Duplicate participant userId: ${userId}`);
    }
    participantsById.set(userId, {
      userId,
      role: participant.role,
    });
  }

  function requireParticipant(userId: string): CommentsTasksParticipant {
    const normalizedUserId = requireNonEmptyString(userId, 'userId');
    const participant = participantsById.get(normalizedUserId);
    if (!participant) {
      throw new Error(`Unknown participant: ${normalizedUserId}`);
    }
    return participant;
  }

  function requireTask(taskId: string): CommentTask {
    const normalizedTaskId = requireNonEmptyString(taskId, 'taskId');
    const task = tasksById.get(normalizedTaskId);
    if (!task) {
      throw new Error(`Unknown task: ${normalizedTaskId}`);
    }
    return task;
  }

  function saveTask(task: CommentTask): CommentTask {
    tasksById.set(task.taskId, task);
    return { ...task };
  }

  return {
    createTask(taskInput: CreateTaskInput): CommentTask {
      const actor = requireParticipant(taskInput.actorId);
      if (!canCreateTask(actor.role)) {
        throw new Error(
          `Permission denied: ${actor.userId} cannot create tasks`,
        );
      }

      const taskId = requireNonEmptyString(taskInput.taskId, 'taskId');
      if (tasksById.has(taskId)) {
        throw new Error(`Task already exists: ${taskId}`);
      }

      const entityId = requireNonEmptyString(taskInput.entityId, 'entityId');
      if (!entityIds.has(entityId)) {
        throw new Error(`Unknown entity reference: ${entityId}`);
      }

      const body = requireNonEmptyString(taskInput.body, 'body');
      const assigneeId =
        taskInput.assigneeId === undefined
          ? undefined
          : requireParticipant(taskInput.assigneeId).userId;

      return saveTask({
        taskId,
        entityId,
        body,
        status: 'open',
        createdBy: actor.userId,
        assigneeId,
        createdAt: taskInput.createdAt ?? new Date().toISOString(),
      });
    },

    assignTask(taskInput: AssignTaskInput): CommentTask {
      const actor = requireParticipant(taskInput.actorId);
      if (!canAssignTask(actor.role)) {
        throw new Error(
          `Permission denied: ${actor.userId} cannot assign tasks`,
        );
      }

      const existing = requireTask(taskInput.taskId);
      const assignee = requireParticipant(taskInput.assigneeId);

      return saveTask({
        ...existing,
        assigneeId: assignee.userId,
      });
    },

    resolveTask(taskInput: ResolveTaskInput): CommentTask {
      const actor = requireParticipant(taskInput.actorId);
      const existing = requireTask(taskInput.taskId);

      if (!canUpdateTaskState(actor.role, actor.userId, existing)) {
        throw new Error(
          `Permission denied: ${actor.userId} cannot resolve task`,
        );
      }

      if (existing.status === 'resolved') {
        throw new Error(`Task is already resolved: ${existing.taskId}`);
      }

      return saveTask({
        ...existing,
        status: 'resolved',
        resolvedAt: taskInput.resolvedAt ?? new Date().toISOString(),
        resolvedBy: actor.userId,
      });
    },

    reopenTask(taskInput: ReopenTaskInput): CommentTask {
      const actor = requireParticipant(taskInput.actorId);
      const existing = requireTask(taskInput.taskId);

      if (!canUpdateTaskState(actor.role, actor.userId, existing)) {
        throw new Error(
          `Permission denied: ${actor.userId} cannot reopen task`,
        );
      }

      if (existing.status === 'open') {
        throw new Error(`Task is already open: ${existing.taskId}`);
      }

      return saveTask({
        ...existing,
        status: 'open',
        reopenedAt: taskInput.reopenedAt ?? new Date().toISOString(),
        reopenedBy: actor.userId,
      });
    },

    getTask(taskId: string): CommentTask | undefined {
      const task = tasksById.get(taskId);
      return task ? { ...task } : undefined;
    },

    listTasks(): CommentTask[] {
      return [...tasksById.values()].map((task) => ({ ...task }));
    },
  };
}
