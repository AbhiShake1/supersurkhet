type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ConflictPath = string | readonly string[];

export type ConflictPatchOperation = {
  operationId: string;
  actorId: string;
  logicalTimestamp: number;
  targetPath: ConflictPath;
  patch: Record<string, unknown>;
};

export type ConflictFieldVersion = {
  operationId: string;
  actorId: string;
  logicalTimestamp: number;
  tieBreakKey: string;
};

export type ConflictNormalizerResult<TState extends Record<string, unknown>> = {
  state: TState;
  fieldVersions: Record<string, ConflictFieldVersion>;
};

type CandidateFieldWrite = {
  fieldPathSegments: string[];
  value: unknown;
  version: ConflictFieldVersion;
};

const compareStrings = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

export const normalizeFieldConflicts = <TState extends Record<string, unknown>>(
  baseState: TState,
  operations: readonly ConflictPatchOperation[],
): ConflictNormalizerResult<TState> => {
  const winners = new Map<string, CandidateFieldWrite>();

  for (const operation of operations) {
    validateOperation(operation);
    const targetPath = normalizePath(operation.targetPath, 'targetPath');
    const fields = flattenPatch(operation.patch);

    for (const field of fields) {
      const fullPath = [...targetPath, ...field.path];
      const fieldKey = fullPath.join('/');
      const tieBreakKey = [
        targetPath.join('/'),
        field.path.join('/'),
        operation.actorId,
        operation.operationId,
        stableJsonStringify(field.value),
      ].join('|');
      const candidate: CandidateFieldWrite = {
        fieldPathSegments: fullPath,
        value: cloneJsonLike(field.value),
        version: {
          operationId: operation.operationId,
          actorId: operation.actorId,
          logicalTimestamp: operation.logicalTimestamp,
          tieBreakKey,
        },
      };

      const current = winners.get(fieldKey);
      if (
        !current ||
        shouldReplaceCandidate(current.version, candidate.version)
      ) {
        winners.set(fieldKey, candidate);
      }
    }
  }

  const normalizedState = cloneJsonLike(baseState) as TState;
  const fieldVersions: Record<string, ConflictFieldVersion> = {};

  for (const [fieldKey, winner] of winners.entries()) {
    setAtPath(normalizedState, winner.fieldPathSegments, winner.value);
    fieldVersions[fieldKey] = winner.version;
  }

  return {
    state: normalizedState,
    fieldVersions,
  };
};

const shouldReplaceCandidate = (
  current: ConflictFieldVersion,
  incoming: ConflictFieldVersion,
): boolean => {
  if (incoming.logicalTimestamp !== current.logicalTimestamp) {
    return incoming.logicalTimestamp > current.logicalTimestamp;
  }
  return compareStrings(incoming.tieBreakKey, current.tieBreakKey) > 0;
};

const setAtPath = (
  root: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): void => {
  if (path.length === 0) {
    throw new TypeError('field path must not be empty');
  }

  let cursor: Record<string, unknown> = root;
  const lastIndex = path.length - 1;
  for (let index = 0; index < lastIndex; index += 1) {
    const segment = path[index];
    const existing = cursor[segment];

    if (!isRecord(existing)) {
      const next: Record<string, unknown> = {};
      cursor[segment] = next;
      cursor = next;
      continue;
    }

    cursor = existing;
  }

  cursor[path[lastIndex]] = value;
};

const flattenPatch = (
  patch: Record<string, unknown>,
): Array<{ path: string[]; value: unknown }> => {
  const flattened: Array<{ path: string[]; value: unknown }> = [];

  const visit = (value: unknown, currentPath: string[]) => {
    if (!isRecord(value)) {
      flattened.push({
        path: currentPath,
        value,
      });
      return;
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
      flattened.push({
        path: currentPath,
        value: {},
      });
      return;
    }

    for (const [key, entry] of entries) {
      visit(entry, [...currentPath, key]);
    }
  };

  for (const [key, value] of Object.entries(patch)) {
    visit(value, [key]);
  }

  return flattened;
};

const normalizePath = (value: ConflictPath, fieldName: string): string[] => {
  const segments =
    typeof value === 'string'
      ? value
          .split('/')
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0)
      : value.map((segment) => segment.trim());

  if (
    segments.length === 0 ||
    segments.some((segment) => segment.length === 0)
  ) {
    throw new TypeError(`${fieldName} must be a non-empty path`);
  }

  return [...segments];
};

const validateOperation = (operation: ConflictPatchOperation): void => {
  if (
    typeof operation.operationId !== 'string' ||
    operation.operationId.trim().length === 0
  ) {
    throw new TypeError('operationId must be a non-empty string');
  }

  if (
    typeof operation.actorId !== 'string' ||
    operation.actorId.trim().length === 0
  ) {
    throw new TypeError('actorId must be a non-empty string');
  }

  if (
    !Number.isInteger(operation.logicalTimestamp) ||
    operation.logicalTimestamp < 0
  ) {
    throw new TypeError(
      `Invalid conflict operation "${operation.operationId}": logicalTimestamp must be a non-negative integer.`,
    );
  }

  if (!isRecord(operation.patch)) {
    throw new TypeError(
      `Invalid conflict operation "${operation.operationId}": patch must be an object.`,
    );
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stableJsonStringify = (value: unknown): string => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(',')}]`;
  }

  const record = isRecord(value)
    ? value
    : ({
        value,
      } as const);
  const entries = Object.entries(record).sort(([left], [right]) =>
    compareStrings(left, right),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableJsonStringify(entryValue)}`,
    )
    .join(',')}}`;
};

const cloneJsonLike = (value: unknown): unknown => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value as JsonValue;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloneJsonLike(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  const cloned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    cloned[key] = cloneJsonLike(entry);
  }
  return cloned;
};
