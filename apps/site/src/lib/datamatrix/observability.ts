import type { DataMatrixV2EventLog } from '@/lib/schema';

export const DATAMATRIX_EVENT_LOG_FIELDS = [
  'id',
  'businessId',
  'schedulerId',
  'jobId',
  'runId',
  'stepAttemptId',
  'level',
  'eventType',
  'message',
  'data',
  'createdAt',
] as const;

export const DATAMATRIX_EVENT_SEVERITIES = ['info', 'warn', 'error'] as const;

export type DataMatrixEventSeverity =
  (typeof DATAMATRIX_EVENT_SEVERITIES)[number];

export const DATAMATRIX_EVENT_TYPES = [
  'job.queued',
  'job.leased',
  'run.started',
  'run.completed',
  'run.failed',
  'run.cancelled',
  'step.started',
  'step.completed',
  'step.failed',
  'step.skipped',
  'step.cancelled',
  'retention.started',
  'retention.completed',
  'retention.failed',
] as const;

export type DataMatrixEventType = (typeof DATAMATRIX_EVENT_TYPES)[number];

const DATAMATRIX_EVENT_SEVERITY_BY_TYPE: Record<
  DataMatrixEventType,
  DataMatrixEventSeverity
> = {
  'job.queued': 'info',
  'job.leased': 'info',
  'run.started': 'info',
  'run.completed': 'info',
  'run.failed': 'error',
  'run.cancelled': 'warn',
  'step.started': 'info',
  'step.completed': 'info',
  'step.failed': 'error',
  'step.skipped': 'warn',
  'step.cancelled': 'warn',
  'retention.started': 'info',
  'retention.completed': 'info',
  'retention.failed': 'error',
};

export interface DataMatrixEventEnvelope {
  businessId: string;
  schedulerId?: string;
  jobId: string;
  runId?: string;
  stepAttemptId?: string;
  eventType: DataMatrixEventType | (string & {});
  message: string;
  level?: DataMatrixEventSeverity;
  data?: DataMatrixV2EventLog['data'];
  id?: string;
  createdAt?: string;
}

export interface DataMatrixEventFactoryOptions {
  now?: () => string;
  createId?: () => string;
}

export interface DataMatrixEventSink {
  write(event: DataMatrixV2EventLog): Promise<void> | void;
}

const DATAMATRIX_OBSERVABILITY_DEFAULTS: Required<DataMatrixEventFactoryOptions> =
  {
    now: () => new Date().toISOString(),
    createId: createDataMatrixEventId,
  };

export function isDataMatrixEventType(
  value: string,
): value is DataMatrixEventType {
  return DATAMATRIX_EVENT_TYPES.includes(value as DataMatrixEventType);
}

export function resolveDataMatrixEventSeverity(eventType: string) {
  if (!isDataMatrixEventType(eventType)) {
    return 'info';
  }
  return DATAMATRIX_EVENT_SEVERITY_BY_TYPE[eventType];
}

export function createDataMatrixEventLog(
  envelope: DataMatrixEventEnvelope,
  options: DataMatrixEventFactoryOptions = DATAMATRIX_OBSERVABILITY_DEFAULTS,
): DataMatrixV2EventLog {
  const now = options.now ?? DATAMATRIX_OBSERVABILITY_DEFAULTS.now;
  const createId =
    options.createId ?? DATAMATRIX_OBSERVABILITY_DEFAULTS.createId;

  return {
    id: envelope.id ?? createId(),
    businessId: envelope.businessId,
    schedulerId: envelope.schedulerId,
    jobId: envelope.jobId,
    runId: envelope.runId,
    stepAttemptId: envelope.stepAttemptId,
    level: envelope.level ?? resolveDataMatrixEventSeverity(envelope.eventType),
    eventType: envelope.eventType,
    message: envelope.message,
    data: envelope.data,
    createdAt: envelope.createdAt ?? now(),
  };
}

export async function emitDataMatrixEvent(
  sink: DataMatrixEventSink,
  envelope: DataMatrixEventEnvelope,
  options?: DataMatrixEventFactoryOptions,
) {
  const event = createDataMatrixEventLog(envelope, options);
  await sink.write(event);
  return event;
}

export async function emitDataMatrixEvents(
  sink: DataMatrixEventSink,
  envelopes: readonly DataMatrixEventEnvelope[],
  options?: DataMatrixEventFactoryOptions,
) {
  const emitted: DataMatrixV2EventLog[] = [];
  for (const envelope of envelopes) {
    const event = await emitDataMatrixEvent(sink, envelope, options);
    emitted.push(event);
  }
  return emitted;
}

function createDataMatrixEventId() {
  return `dm2-event-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
