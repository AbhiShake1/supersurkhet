export type RuntimeHealthEventType =
  | 'session_open'
  | 'session_close'
  | 'runtime_error';

export interface RuntimeHealthEventDoc {
  eventId: string;
  eventType: RuntimeHealthEventType;
  sessionId: string;
  occurredAt: string;
  surface: string;
  component?: string;
  pluginId?: string;
  pluginVersion?: string;
  fingerprint?: string;
  metadata?: Record<string, unknown>;
}

export interface LastKnownGoodSnapshotDoc {
  snapshotId: string;
  sessionId: string;
  updatedAt: string;
  surface: string;
  pluginId?: string;
  pluginVersion?: string;
}

export interface RuntimeHealthStoragePort {
  writeEvent(event: RuntimeHealthEventDoc): Promise<void>;
  writeLastKnownGood(snapshot: LastKnownGoodSnapshotDoc): Promise<void>;
}

export interface RuntimeHealthSessionContext {
  sessionId: string;
  surface: string;
  component?: string;
  pluginId?: string;
  pluginVersion?: string;
}

export interface RuntimeHealthErrorContext extends RuntimeHealthSessionContext {
  fingerprint: string;
  errorName?: string;
  errorMessage?: string;
  stackPreview?: string;
}

interface RuntimeHealthServiceOptions {
  localStore: RuntimeHealthStoragePort;
  graphMirrorStore: RuntimeHealthStoragePort;
  now?: () => string;
  createEventId?: () => string;
  maxWriteAttempts?: number;
}

export class RuntimeHealthService {
  private readonly stores: RuntimeHealthStoragePort[];
  private readonly now: () => string;
  private readonly createEventId: () => string;
  private readonly maxWriteAttempts: number;

  constructor(options: RuntimeHealthServiceOptions) {
    this.stores = [options.localStore, options.graphMirrorStore];
    this.now = options.now ?? (() => new Date().toISOString());
    this.createEventId = options.createEventId ?? createRuntimeHealthEventId;
    this.maxWriteAttempts = Math.max(1, options.maxWriteAttempts ?? 2);
  }

  async captureSessionOpen(context: RuntimeHealthSessionContext) {
    const event = this.buildEvent('session_open', context);
    await this.writeEventToAllStores(event);
    return event;
  }

  async captureSessionClose(
    context: RuntimeHealthSessionContext,
    reason: string,
  ) {
    const event = this.buildEvent('session_close', context, { reason });
    await this.writeEventToAllStores(event);
    return event;
  }

  async captureError(context: RuntimeHealthErrorContext) {
    const event = this.buildEvent('runtime_error', context, {
      errorName: context.errorName,
      errorMessage: context.errorMessage,
      stackPreview: context.stackPreview,
    });

    event.fingerprint = context.fingerprint;
    await this.writeEventToAllStores(event);
    return event;
  }

  async updateLastKnownGood(
    context: RuntimeHealthSessionContext,
    snapshotId: string,
  ) {
    const snapshot: LastKnownGoodSnapshotDoc = {
      snapshotId,
      sessionId: context.sessionId,
      surface: context.surface,
      pluginId: context.pluginId,
      pluginVersion: context.pluginVersion,
      updatedAt: this.now(),
    };

    await this.writeToAllStores((store) => store.writeLastKnownGood(snapshot));
    return snapshot;
  }

  private buildEvent(
    eventType: RuntimeHealthEventType,
    context: RuntimeHealthSessionContext,
    metadata?: Record<string, unknown>,
  ): RuntimeHealthEventDoc {
    return {
      eventId: this.createEventId(),
      eventType,
      sessionId: context.sessionId,
      occurredAt: this.now(),
      surface: context.surface,
      component: context.component,
      pluginId: context.pluginId,
      pluginVersion: context.pluginVersion,
      metadata,
    };
  }

  private async writeEventToAllStores(event: RuntimeHealthEventDoc) {
    await this.writeToAllStores((store) => store.writeEvent(event));
  }

  private async writeToAllStores(
    writeOperation: (store: RuntimeHealthStoragePort) => Promise<void>,
  ) {
    const failures: unknown[] = [];

    for (const store of this.stores) {
      try {
        await this.runWithRetry(() => writeOperation(store));
      } catch (error) {
        failures.push(error);
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'RuntimeHealthService failed to persist to one or more stores',
      );
    }
  }

  private async runWithRetry(operation: () => Promise<void>) {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxWriteAttempts; attempt += 1) {
      try {
        await operation();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }
}

let runtimeHealthCounter = 0;

function createRuntimeHealthEventId() {
  runtimeHealthCounter += 1;
  return `runtime-health-event-${runtimeHealthCounter}`;
}
