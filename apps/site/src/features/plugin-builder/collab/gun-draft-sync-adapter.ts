import {
  type DeterministicOperationReducer,
  type ReplayableOperation,
  replayDeterministicReducer,
} from '@/features/plugin-builder/domain/operations/reducer-replay';
import { getGunRef } from '@/lib/gun/utils';

type GunAck = Record<string, unknown>;

type GunRef = {
  get: (key: string) => GunRef;
  once: (callback: (data: unknown) => void) => void;
  on: (
    callback: (data: unknown, key?: string) => void,
  ) => { off?: () => void } | (() => void) | undefined;
  put: (value: unknown, callback?: (ack: GunAck) => void) => void;
  off?: () => void;
};

export type DraftPatchAckMetadata = {
  operationId: string;
  acknowledgedAt: string;
  ok: boolean;
  error?: string;
  raw: GunAck;
};

export type DraftSyncSnapshot<State, Operation extends ReplayableOperation> = {
  state: State;
  appliedOperations: Operation[];
  appliedOperationIds: string[];
  skippedDuplicateOperationIds: string[];
  source: 'hydrate' | 'stream';
};

export type GunDraftSubscription = {
  reconnect: () => void;
  unsubscribe: () => void;
};

export type GunDraftSyncAdapter<
  State,
  Operation extends ReplayableOperation,
> = {
  load: () => Promise<DraftSyncSnapshot<State, Operation>>;
  subscribe: (
    listener: (snapshot: DraftSyncSnapshot<State, Operation>) => void,
    onError?: (error: unknown) => void,
  ) => GunDraftSubscription;
  applyPatch: (operation: Operation) => Promise<DraftPatchAckMetadata>;
};

export type CreateGunDraftSyncAdapterParams<
  State,
  Operation extends ReplayableOperation,
> = {
  draftPath: string;
  baseState: State;
  reducer: DeterministicOperationReducer<State, Operation>;
  parseOperation: (input: unknown) => Operation;
  getRootRef?: (path: string) => GunRef;
  hydrateKey?: string;
  patchesKey?: string;
};

const DEFAULT_HYDRATE_KEY = 'hydrate';
const DEFAULT_PATCHES_KEY = 'patches';

export const createGunDraftSyncAdapter = <
  State,
  Operation extends ReplayableOperation,
>({
  draftPath,
  baseState,
  reducer,
  parseOperation,
  getRootRef = (path) => getGunRef(path) as unknown as GunRef,
  hydrateKey = DEFAULT_HYDRATE_KEY,
  patchesKey = DEFAULT_PATCHES_KEY,
}: CreateGunDraftSyncAdapterParams<State, Operation>): GunDraftSyncAdapter<
  State,
  Operation
> => {
  const rootNode = getRootRef(draftPath);
  const hydrateNode = rootNode.get(hydrateKey);
  const patchesNode = rootNode.get(patchesKey);

  let hydratedBaseState = baseState;
  let operations: Operation[] = [];
  let latestSnapshot: DraftSyncSnapshot<State, Operation> | null = null;
  let hydratePromise: Promise<DraftSyncSnapshot<State, Operation>> | null =
    null;

  const buildSnapshot = (
    source: DraftSyncSnapshot<State, Operation>['source'],
  ): DraftSyncSnapshot<State, Operation> => {
    const replayResult = replayDeterministicReducer({
      initialState: hydratedBaseState,
      operations,
      reducer,
    });

    const snapshot: DraftSyncSnapshot<State, Operation> = {
      state: replayResult.state,
      appliedOperations: replayResult.appliedOperations,
      appliedOperationIds: replayResult.appliedOperationIds,
      skippedDuplicateOperationIds: replayResult.skippedDuplicateOperationIds,
      source,
    };

    latestSnapshot = snapshot;
    return snapshot;
  };

  const load = async (): Promise<DraftSyncSnapshot<State, Operation>> => {
    if (hydratePromise) {
      return hydratePromise;
    }

    hydratePromise = readOnce(hydrateNode).then((rawHydrate) => {
      const envelope = normalizeHydrateEnvelope(rawHydrate);

      hydratedBaseState = envelope.state ?? baseState;
      operations = envelope.operations.map((entry) => parseOperation(entry));

      return buildSnapshot('hydrate');
    });

    return hydratePromise;
  };

  const applyPatch = async (
    operation: Operation,
  ): Promise<DraftPatchAckMetadata> => {
    const patchNode = patchesNode.get(operation.id);
    const sentAt = new Date().toISOString();

    const payload = {
      operation,
      metadata: {
        operationId: operation.id,
        sentAt,
      },
    };

    const ack = await putWithAck(patchNode, payload);
    const error =
      typeof ack.err === 'string' && ack.err.length > 0 ? ack.err : undefined;

    return {
      operationId: operation.id,
      acknowledgedAt: new Date().toISOString(),
      ok: error === undefined,
      error,
      raw: ack,
    };
  };

  const subscribe = (
    listener: (snapshot: DraftSyncSnapshot<State, Operation>) => void,
    onError?: (error: unknown) => void,
  ): GunDraftSubscription => {
    let closed = false;
    let detach = () => {};

    const handlePatch = (rawPatch: unknown, key?: string) => {
      if (closed || key === '_') {
        return;
      }

      try {
        const normalized = normalizePatchRecord(rawPatch);
        operations = [...operations, parseOperation(normalized)];
        listener(buildSnapshot('stream'));
      } catch (error) {
        onError?.(error);
      }
    };

    const attach = () => {
      const handle = patchesNode.on(handlePatch);
      detach = toDetachFn(handle, patchesNode);
    };

    if (latestSnapshot) {
      listener(latestSnapshot);
      attach();
    } else {
      void load()
        .then((snapshot) => {
          if (closed) {
            return;
          }

          listener(snapshot);
          attach();
        })
        .catch((error) => {
          onError?.(error);
        });
    }

    return {
      reconnect: () => {
        if (closed) {
          return;
        }

        detach();
        attach();
      },
      unsubscribe: () => {
        if (closed) {
          return;
        }

        closed = true;
        detach();
      },
    };
  };

  return {
    load,
    subscribe,
    applyPatch,
  };
};

const readOnce = (node: GunRef): Promise<unknown> =>
  new Promise((resolve) => {
    node.once((data) => {
      resolve(data);
    });
  });

const putWithAck = (node: GunRef, value: unknown): Promise<GunAck> =>
  new Promise((resolve) => {
    node.put(value, (ack) => {
      resolve(ack ?? {});
    });
  });

const normalizeHydrateEnvelope = (
  value: unknown,
): { state?: unknown; operations: unknown[] } => {
  if (!isRecord(value)) {
    return {
      operations: [],
    };
  }

  const operations = value.operations;
  if (operations !== undefined && !Array.isArray(operations)) {
    throw new TypeError('hydrate.operations must be an array when provided');
  }

  return {
    state: value.state,
    operations: operations ?? [],
  };
};

const normalizePatchRecord = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  return 'operation' in value ? value.operation : value;
};

const toDetachFn = (handle: unknown, node: GunRef): (() => void) => {
  if (typeof handle === 'function') {
    return handle;
  }

  if (isRecord(handle) && typeof handle.off === 'function') {
    return () => {
      handle.off();
    };
  }

  if (typeof node.off === 'function') {
    return () => {
      node.off?.();
    };
  }

  return () => {};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
