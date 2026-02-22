export type ReplayableOperation<Payload = unknown> = {
  id: string;
  type: string;
  actorId: string;
  logicalTimestamp: number;
  targetPath: string;
  payload: Payload;
};

export type DeterministicOperationReducer<
  State,
  Operation extends ReplayableOperation,
> = (state: State, operation: Operation) => State;

export type ReplayDeterministicReducerParams<
  State,
  Operation extends ReplayableOperation,
> = {
  initialState: State;
  operations: readonly Operation[];
  reducer: DeterministicOperationReducer<State, Operation>;
  previouslyAppliedOperationIds?: Iterable<string>;
};

export type ReplayDeterministicReducerResult<
  State,
  Operation extends ReplayableOperation,
> = {
  state: State;
  appliedOperations: Operation[];
  appliedOperationIds: string[];
  skippedDuplicateOperationIds: string[];
};

type DeterministicSortKey = {
  logicalTimestamp: number;
  targetPath: string;
  type: string;
  actorId: string;
  id: string;
  payloadKey: string;
};

const compareStrings = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const toDeterministicKey = (
  operation: ReplayableOperation,
): DeterministicSortKey => {
  validateReplayableOperation(operation);

  return {
    logicalTimestamp: operation.logicalTimestamp,
    targetPath: operation.targetPath,
    type: operation.type,
    actorId: operation.actorId,
    id: operation.id,
    payloadKey: stableJsonStringify(operation.payload),
  };
};

const compareDeterministicKeys = (
  left: DeterministicSortKey,
  right: DeterministicSortKey,
): number => {
  if (left.logicalTimestamp !== right.logicalTimestamp) {
    return left.logicalTimestamp - right.logicalTimestamp;
  }

  return (
    compareStrings(left.targetPath, right.targetPath) ||
    compareStrings(left.type, right.type) ||
    compareStrings(left.actorId, right.actorId) ||
    compareStrings(left.id, right.id) ||
    compareStrings(left.payloadKey, right.payloadKey)
  );
};

export const sortOperationsDeterministically = <
  Operation extends ReplayableOperation,
>(
  operations: readonly Operation[],
): Operation[] =>
  operations
    .map((operation) => ({
      operation,
      key: toDeterministicKey(operation),
    }))
    .sort((left, right) => compareDeterministicKeys(left.key, right.key))
    .map(({ operation }) => operation);

export const replayDeterministicReducer = <
  State,
  Operation extends ReplayableOperation,
>({
  initialState,
  operations,
  reducer,
  previouslyAppliedOperationIds,
}: ReplayDeterministicReducerParams<
  State,
  Operation
>): ReplayDeterministicReducerResult<State, Operation> => {
  const sortedOperations = sortOperationsDeterministically(operations);
  const seenOperationIds = new Set(previouslyAppliedOperationIds ?? []);
  const appliedOperations: Operation[] = [];
  const skippedDuplicateOperationIds: string[] = [];
  let currentState = initialState;

  for (const operation of sortedOperations) {
    const operationId = operation.id;

    if (seenOperationIds.has(operationId)) {
      skippedDuplicateOperationIds.push(operationId);
      continue;
    }

    currentState = reducer(currentState, operation);
    seenOperationIds.add(operationId);
    appliedOperations.push(operation);
  }

  return {
    state: currentState,
    appliedOperations,
    appliedOperationIds: [...seenOperationIds],
    skippedDuplicateOperationIds,
  };
};

const validateReplayableOperation = (operation: ReplayableOperation): void => {
  if (!operation.id || typeof operation.id !== 'string') {
    throw new TypeError(
      'Invalid replayable operation: id must be a non-empty string.',
    );
  }

  if (!Number.isFinite(operation.logicalTimestamp)) {
    throw new TypeError(
      `Invalid replayable operation "${operation.id}": logicalTimestamp must be a finite number.`,
    );
  }

  if (typeof operation.actorId !== 'string' || operation.actorId.length === 0) {
    throw new TypeError(
      `Invalid replayable operation "${operation.id}": actorId must be a non-empty string.`,
    );
  }

  if (typeof operation.type !== 'string' || operation.type.length === 0) {
    throw new TypeError(
      `Invalid replayable operation "${operation.id}": type must be a non-empty string.`,
    );
  }

  if (
    typeof operation.targetPath !== 'string' ||
    operation.targetPath.length === 0
  ) {
    throw new TypeError(
      `Invalid replayable operation "${operation.id}": targetPath must be a non-empty string.`,
    );
  }
};

const stableJsonStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    compareStrings(left, right),
  );

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableJsonStringify(entryValue)}`,
    )
    .join(',')}}`;
};
