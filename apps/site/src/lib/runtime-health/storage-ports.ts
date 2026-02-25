import type {
  LastKnownGoodSnapshotDoc,
  RuntimeHealthEventDoc,
} from './contracts';

export interface RuntimeHealthRingBufferReadQuery {
  businessId: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface RuntimeHealthLocalRingBufferPort {
  appendEvent(event: RuntimeHealthEventDoc): Promise<void> | void;
  getRecentEvents(
    query: RuntimeHealthRingBufferReadQuery,
  ): Promise<RuntimeHealthEventDoc[]> | RuntimeHealthEventDoc[];
}

export interface RuntimeHealthGraphMirrorPort {
  upsertEvent(event: RuntimeHealthEventDoc): Promise<void> | void;
  upsertLastKnownGoodSnapshot(
    snapshot: LastKnownGoodSnapshotDoc,
  ): Promise<void> | void;
}

export interface RuntimeHealthStoragePorts {
  localRingBuffer: RuntimeHealthLocalRingBufferPort;
  graphMirror: RuntimeHealthGraphMirrorPort;
}
