import type { JsonValue } from 'supersurkhet-sdk';

export const WORKSPACE_OPERATION_KINDS = [
  'create',
  'update',
  'delete',
  'move',
  'link',
  'unlink',
  'comment',
  'review-state',
] as const;

export type WorkspaceOperationKind = (typeof WORKSPACE_OPERATION_KINDS)[number];
export type WorkspacePath = readonly [string, ...string[]];

export type WorkspaceOperationActor = {
  userId: string;
  sessionId?: string;
};

export type WorkspaceOperationMetadata = {
  operationId: string;
  actor: WorkspaceOperationActor;
  logicalTimestamp: number;
  recordedAt: string;
  targetPath: WorkspacePath;
};

export type WorkspaceCreateOperation = WorkspaceOperationMetadata & {
  type: 'create';
  value: JsonValue;
};

export type WorkspaceUpdateOperation = WorkspaceOperationMetadata & {
  type: 'update';
  patch: JsonValue;
};

export type WorkspaceDeleteOperation = WorkspaceOperationMetadata & {
  type: 'delete';
  reason?: string;
};

export type WorkspaceMoveOperation = WorkspaceOperationMetadata & {
  type: 'move';
  fromPath: WorkspacePath;
};

export type WorkspaceLinkOperation = WorkspaceOperationMetadata & {
  type: 'link';
  sourcePath: WorkspacePath;
  relation: string;
};

export type WorkspaceUnlinkOperation = WorkspaceOperationMetadata & {
  type: 'unlink';
  sourcePath: WorkspacePath;
  relation: string;
};

export type WorkspaceCommentOperation = WorkspaceOperationMetadata & {
  type: 'comment';
  commentId: string;
  body: string;
  threadPath?: WorkspacePath;
};

export type WorkspaceReviewState = 'pending' | 'changes-requested' | 'approved';

export type WorkspaceReviewStateOperation = WorkspaceOperationMetadata & {
  type: 'review-state';
  reviewState: WorkspaceReviewState;
  note?: string;
};

export type WorkspaceOperation =
  | WorkspaceCreateOperation
  | WorkspaceUpdateOperation
  | WorkspaceDeleteOperation
  | WorkspaceMoveOperation
  | WorkspaceLinkOperation
  | WorkspaceUnlinkOperation
  | WorkspaceCommentOperation
  | WorkspaceReviewStateOperation;

export class WorkspaceOperationParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceOperationParseError';
  }
}

export function parseWorkspaceOperation(input: unknown): WorkspaceOperation {
  const record = asRecord(input);
  const type = readOperationKind(record.type);
  const metadata = parseMetadata(record);

  if (type === 'create') {
    return {
      ...metadata,
      type,
      value: parseJsonValue(record.value, 'value'),
    };
  }
  if (type === 'update') {
    return {
      ...metadata,
      type,
      patch: parseJsonValue(record.patch, 'patch'),
    };
  }
  if (type === 'delete') {
    const reason = record.reason;
    if (reason !== undefined && typeof reason !== 'string') {
      throw new WorkspaceOperationParseError(
        'reason must be a string when provided',
      );
    }
    return {
      ...metadata,
      type,
      reason,
    };
  }
  if (type === 'move') {
    return {
      ...metadata,
      type,
      fromPath: parsePath(record.fromPath, 'fromPath'),
    };
  }
  if (type === 'link' || type === 'unlink') {
    const relation = requireNonEmptyString(record.relation, 'relation');
    return {
      ...metadata,
      type,
      relation,
      sourcePath: parsePath(record.sourcePath, 'sourcePath'),
    };
  }
  if (type === 'comment') {
    const threadPath =
      record.threadPath === undefined
        ? undefined
        : parsePath(record.threadPath, 'threadPath');
    return {
      ...metadata,
      type,
      commentId: requireNonEmptyString(record.commentId, 'commentId'),
      body: requireNonEmptyString(record.body, 'body'),
      threadPath,
    };
  }

  const reviewState = record.reviewState;
  if (
    reviewState !== 'pending' &&
    reviewState !== 'changes-requested' &&
    reviewState !== 'approved'
  ) {
    throw new WorkspaceOperationParseError(
      'reviewState must be one of pending, changes-requested, approved',
    );
  }
  const note = record.note;
  if (note !== undefined && typeof note !== 'string') {
    throw new WorkspaceOperationParseError(
      'note must be a string when provided',
    );
  }
  return {
    ...metadata,
    type,
    reviewState,
    note,
  };
}

export function decodeWorkspaceOperation(input: unknown): WorkspaceOperation {
  const record = asRecord(input);
  const legacyActor =
    record.actor !== undefined && record.actor !== null
      ? asRecord(record.actor)
      : undefined;

  if ('type' in record) {
    return parseWorkspaceOperation(record);
  }

  const legacyKind = readOperationKind(
    record.kind ?? record.operationType ?? record.op,
  );
  const normalized: Record<string, unknown> = {
    operationId: record.operationId ?? record.id ?? record.eventId,
    type: legacyKind,
    actor: {
      userId: record.actorId ?? legacyActor?.userId,
      sessionId: record.sessionId ?? legacyActor?.sessionId,
    },
    logicalTimestamp: record.logicalTimestamp ?? record.ts ?? record.clock,
    recordedAt: record.recordedAt ?? record.at ?? record.timestamp,
    targetPath: record.targetPath ?? record.path,
  };

  if (legacyKind === 'create') {
    normalized.value = record.value ?? record.after ?? record.data;
  } else if (legacyKind === 'update') {
    normalized.patch = record.patch ?? record.data ?? record.delta;
  } else if (legacyKind === 'delete') {
    normalized.reason = record.reason;
  } else if (legacyKind === 'move') {
    normalized.fromPath = record.fromPath ?? record.previousPath;
  } else if (legacyKind === 'link' || legacyKind === 'unlink') {
    normalized.sourcePath =
      record.sourcePath ?? record.fromPath ?? record.linkPath;
    normalized.relation = record.relation ?? record.linkType;
  } else if (legacyKind === 'comment') {
    normalized.commentId = record.commentId ?? record.comment_id ?? record.id;
    normalized.body = record.body ?? record.comment ?? record.text;
    normalized.threadPath = record.threadPath ?? record.thread;
  } else if (legacyKind === 'review-state') {
    normalized.reviewState = record.reviewState ?? record.state;
    normalized.note = record.note ?? record.comment;
  }

  return parseWorkspaceOperation(normalized);
}

function parseMetadata(
  input: Record<string, unknown>,
): WorkspaceOperationMetadata {
  const actorRecord = asRecord(input.actor);
  return {
    operationId: requireNonEmptyString(input.operationId, 'operationId'),
    actor: {
      userId: requireNonEmptyString(actorRecord.userId, 'actor.userId'),
      sessionId:
        actorRecord.sessionId === undefined
          ? undefined
          : requireNonEmptyString(actorRecord.sessionId, 'actor.sessionId'),
    },
    logicalTimestamp: parseLogicalTimestamp(input.logicalTimestamp),
    recordedAt: parseIsoTimestamp(input.recordedAt),
    targetPath: parsePath(input.targetPath, 'targetPath'),
  };
}

function readOperationKind(value: unknown): WorkspaceOperationKind {
  if (
    value === 'create' ||
    value === 'update' ||
    value === 'delete' ||
    value === 'move' ||
    value === 'link' ||
    value === 'unlink' ||
    value === 'comment' ||
    value === 'review-state'
  ) {
    return value;
  }
  throw new WorkspaceOperationParseError(
    `type must be one of ${WORKSPACE_OPERATION_KINDS.join(', ')}`,
  );
}

function parseLogicalTimestamp(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new WorkspaceOperationParseError(
      'logicalTimestamp must be a non-negative integer',
    );
  }
  return value;
}

function parseIsoTimestamp(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new WorkspaceOperationParseError(
      'recordedAt must be an ISO-compatible timestamp string',
    );
  }
  return value;
}

function parsePath(value: unknown, fieldName: string): WorkspacePath {
  if (typeof value === 'string') {
    const tokens = value
      .split('/')
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      throw new WorkspaceOperationParseError(`${fieldName} must not be empty`);
    }
    return tokens as WorkspacePath;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new WorkspaceOperationParseError(
      `${fieldName} must be a non-empty path array`,
    );
  }
  for (const segment of value) {
    if (typeof segment !== 'string' || segment.length === 0) {
      throw new WorkspaceOperationParseError(
        `${fieldName} path segments must be non-empty strings`,
      );
    }
  }
  return value as WorkspacePath;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new WorkspaceOperationParseError(
      `${fieldName} must be a non-empty string`,
    );
  }
  return value;
}

function parseJsonValue(value: unknown, fieldName: string): JsonValue {
  if (!isJsonValue(value)) {
    throw new WorkspaceOperationParseError(
      `${fieldName} must be valid JSON value`,
    );
  }
  return value;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value !== 'object') {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkspaceOperationParseError('operation must be an object');
  }
  return value as Record<string, unknown>;
}
