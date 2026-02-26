'use client';

import {
  Activity,
  Bot,
  Clock3,
  Eye,
  EyeOff,
  RotateCcw,
  ScanLine,
  Trash2,
} from 'lucide-react';
import {
  type ComponentType,
  type KeyboardEvent,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataMatrixScanner } from '@/components/ui/datamatrix-scanner';
import type { DataMatrixAction } from '@/lib/datamatrix';
import {
  ActionExecutor,
  type ActionExecutorState,
} from '@/lib/datamatrix/action-executor';
import type { DataMatrixDeviceCallbackPayload } from '@/lib/datamatrix/device-callback';
import type {
  ScanRouteDeterministicResult,
  ScanRouteFallbackResult,
  ScanRouteResult,
} from '@/lib/datamatrix/scan-router';
import type { DataMatrixEventLogRecord } from '@/lib/datamatrix/scheduler-worker';
import type { PluginWorkflowEventLog } from '@/lib/schema';
import { cn } from '@/lib/utils';

const MAX_TIMELINE_EVENTS = 180;
const MAX_DETERMINISTIC_CARDS = 24;

type ExecutionStatus = 'idle' | 'executing' | 'completed' | 'error';
type ActionHistoryStatus = 'started' | 'completed' | 'failed' | 'skipped';

export type DataMatrixDeterministicCard = {
  id: string;
  runId: string;
  occurredAt: number;
  lane: 'deterministic' | 'fallback';
  actionType: DataMatrixAction['action'] | 'unknown';
  title: string;
  summary: string;
  parserCode: string;
  metadata?: Record<string, string>;
};

export type DataMatrixTimelineEvent = {
  id: string;
  runId: string;
  occurredAt: number;
  source:
    | 'scan-router'
    | 'scheduler'
    | 'executor'
    | 'device-bridge'
    | 'observability'
    | 'ui';
  phase: 'scan' | 'run' | 'step' | 'callback' | 'system';
  status: 'pending' | ActionHistoryStatus;
  message: string;
  detail?: string;
};

type ActionExecutorLike = Pick<
  ActionExecutor,
  'onProgress' | 'onError' | 'execute'
>;

type DataMatrixScannerSurfaceProps = {
  onActionDetected?: (action: DataMatrixAction) => void;
  onFallbackRouted?: (result: ScanRouteFallbackResult) => void;
  showControls?: boolean;
  showManualInput?: boolean;
  showScanResults?: boolean;
};

export interface DataMatrixAgentConsoleProps {
  businessSlug?: string;
  externalDeterministicCards?: DataMatrixDeterministicCard[];
  externalTimelineEvents?: DataMatrixTimelineEvent[];
  externalScanRoutes?: ScanRouteResult[];
  externalSchedulerEvents?: DataMatrixEventLogRecord[];
  externalDeviceCallbacks?: DataMatrixDeviceCallbackPayload[];
  externalObservabilityEvents?: PluginWorkflowEventLog[];
  createExecutor?: (action: DataMatrixAction) => ActionExecutorLike;
  ScannerComponent?: ComponentType<DataMatrixScannerSurfaceProps>;
  onManualRetry?: (context: {
    action: DataMatrixAction | null;
    previousRunId: string | null;
  }) => void;
}

function createRunId(): string {
  return `dm2-run-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toRecentFirst<T extends { occurredAt: number }>(
  items: T[],
  maxItems: number,
): T[] {
  return [...items]
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, maxItems);
}

function dedupeById<T extends { id: string; occurredAt: number }>(
  items: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing || item.occurredAt >= existing.occurredAt) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function toEpochMs(value: string | undefined, fallback = Date.now()): number {
  if (!value) return fallback;
  const epoch = Date.parse(value);
  return Number.isNaN(epoch) ? fallback : epoch;
}

function toScanRouteOccurredAt(routeId: string): number {
  const encodedTimestamp = routeId.split('-')[2];
  if (!encodedTimestamp) return Date.now();
  const decoded = Number.parseInt(encodedTimestamp, 36);
  return Number.isNaN(decoded) ? Date.now() : decoded;
}

function toHistoryEventId(
  runId: string,
  history: { timestamp: number; action: string; status: ActionHistoryStatus },
): string {
  return `history:${runId}:${history.timestamp}:${history.action}:${history.status}`;
}

function toHistoryMessage(action: string): string {
  return action
    .split('.')
    .map((segment) => segment.replaceAll('_', ' '))
    .join(' -> ');
}

function toStatusTone(
  status: DataMatrixTimelineEvent['status'],
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'failed') return 'destructive';
  if (status === 'completed') return 'default';
  if (status === 'started') return 'secondary';
  return 'outline';
}

function buildDeterministicCard(
  action: DataMatrixAction,
  runId: string,
  source: 'scan' | 'manual-retry',
): DataMatrixDeterministicCard {
  const capabilityCount = [
    action.wifi,
    action.navigation,
    action.post_connect?.notification,
    action.on_complete,
  ].filter(Boolean).length;
  return {
    id: `deterministic:${runId}`,
    runId,
    occurredAt: Date.now(),
    lane: 'deterministic',
    actionType: action.action,
    title:
      source === 'manual-retry'
        ? 'Manual retry entered deterministic lane'
        : 'Deterministic lane accepted scan',
    summary:
      'Schema-valid DataMatrix payload routed to executor without LLM fallback.',
    parserCode: 'dm2.router.schema.valid',
    metadata: {
      capabilities: String(capabilityCount),
      checks: String(action.checks?.length ?? 0),
      source,
    },
  };
}

function toDeterministicCardFromScanRoute(
  route: ScanRouteDeterministicResult,
): DataMatrixDeterministicCard {
  return {
    id: `deterministic:${route.routeId}`,
    runId: route.routeId,
    occurredAt: toScanRouteOccurredAt(route.routeId),
    lane: 'deterministic',
    actionType: route.action?.action ?? 'unknown',
    title:
      route.outcome === 'blocked_location'
        ? 'Deterministic lane paused for location stability'
        : 'Deterministic lane accepted scan',
    summary: route.deterministicMessage,
    parserCode:
      route.source === 'signed_engine'
        ? 'dm2.router.signed_engine'
        : 'dm2.router.legacy_action',
    metadata: {
      source: route.source,
      outcome: route.outcome,
      location: route.location.status,
      locationReason: route.location.reason,
    },
  };
}

function toTimelineStatusFromEventType(args: {
  eventType: string;
  level?: 'info' | 'warn' | 'error';
}): DataMatrixTimelineEvent['status'] {
  const eventType = args.eventType.toLowerCase();
  if (args.level === 'error' || eventType.includes('failed')) return 'failed';
  if (eventType.includes('completed')) return 'completed';
  if (eventType.includes('cancelled') || eventType.includes('suppressed')) {
    return 'skipped';
  }
  if (
    eventType.includes('queued') ||
    eventType.includes('leased') ||
    eventType.includes('running') ||
    eventType.includes('started') ||
    eventType.includes('retry')
  ) {
    return 'started';
  }
  return 'pending';
}

function toTimelinePhaseFromEventType(eventTypeValue: string) {
  const eventType = eventTypeValue.toLowerCase();
  if (eventType.includes('scan')) return 'scan' as const;
  if (eventType.includes('callback')) return 'callback' as const;
  if (eventType.includes('.step.') || eventType.startsWith('step.')) {
    return 'step' as const;
  }
  if (
    eventType.includes('.run.') ||
    eventType.startsWith('run.') ||
    eventType.includes('.job.')
  ) {
    return 'run' as const;
  }
  return 'system' as const;
}

function toTimelineEventFromScanRoute(
  route: ScanRouteResult,
): DataMatrixTimelineEvent {
  if (route.lane === 'deterministic') {
    return {
      id: `scan-route:${route.routeId}:deterministic`,
      runId: route.routeId,
      occurredAt: toScanRouteOccurredAt(route.routeId),
      source: 'scan-router',
      phase: 'scan',
      status: route.outcome === 'executed' ? 'completed' : 'pending',
      message: route.deterministicMessage,
      detail: `source=${route.source}; outcome=${route.outcome}; location=${route.location.status}`,
    };
  }

  const statusByOutcome: Record<
    ScanRouteFallbackResult['outcome'],
    DataMatrixTimelineEvent['status']
  > = {
    ai_invoked: 'started',
    ai_not_configured: 'failed',
    suppressed_budget: 'failed',
    suppressed_deduped: 'skipped',
  };

  return {
    id: `scan-route:${route.routeId}:fallback:${route.outcome}`,
    runId: route.routeId,
    occurredAt: toScanRouteOccurredAt(route.routeId),
    source: 'scan-router',
    phase: 'scan',
    status: statusByOutcome[route.outcome],
    message: `Fallback lane ${route.outcome.replaceAll('_', ' ')}`,
    detail: `parser=${route.parserErrorCode}; dedupe=${route.dedupeKey}`,
  };
}

function toTimelineEventFromSchedulerEvent(
  event: DataMatrixEventLogRecord,
): DataMatrixTimelineEvent {
  return {
    id: `scheduler:${event.id}`,
    runId: event.runId ?? event.jobId ?? event.schedulerId ?? 'scheduler',
    occurredAt: toEpochMs(event.createdAt),
    source: 'scheduler',
    phase: toTimelinePhaseFromEventType(event.eventType),
    status: toTimelineStatusFromEventType({
      eventType: event.eventType,
      level: event.level,
    }),
    message: event.message,
    detail: `type=${event.eventType}`,
  };
}

function toTimelineEventFromObservabilityEvent(
  event: PluginWorkflowEventLog,
): DataMatrixTimelineEvent {
  return {
    id: `observability:${event.id}`,
    runId: event.jobId,
    occurredAt: toEpochMs(event.createdAt),
    source: 'observability',
    phase: toTimelinePhaseFromEventType(event.eventType),
    status: toTimelineStatusFromEventType({
      eventType: event.eventType,
      level: event.level,
    }),
    message: event.message,
    detail: `type=${event.eventType}`,
  };
}

function toTimelineEventFromDeviceCallback(
  callback: DataMatrixDeviceCallbackPayload,
): DataMatrixTimelineEvent {
  const status: DataMatrixTimelineEvent['status'] =
    callback.status === 'completed'
      ? 'completed'
      : callback.error?.retryable
        ? 'started'
        : 'failed';

  const message =
    callback.status === 'completed'
      ? `Device callback completed for step "${callback.stepId}"`
      : callback.error?.retryable
        ? `Device callback failed; retry scheduled for step "${callback.stepId}"`
        : `Device callback failed for step "${callback.stepId}"`;

  const detailParts = [
    `attempt=${callback.attempt}`,
    `idempotency=${callback.idempotencyKey}`,
  ];

  if (callback.error?.code) {
    detailParts.push(`error=${callback.error.code}`);
  }

  return {
    id: `device-callback:${callback.idempotencyKey}`,
    runId: callback.runId,
    occurredAt: toEpochMs(callback.callbackAt),
    source: 'device-bridge',
    phase: 'callback',
    status,
    message,
    detail: detailParts.join('; '),
  };
}

function defaultCreateExecutor(action: DataMatrixAction): ActionExecutorLike {
  return new ActionExecutor(action);
}

export function DataMatrixAgentConsole({
  businessSlug,
  externalDeterministicCards = [],
  externalTimelineEvents = [],
  externalScanRoutes = [],
  externalSchedulerEvents = [],
  externalDeviceCallbacks = [],
  externalObservabilityEvents = [],
  createExecutor = defaultCreateExecutor,
  ScannerComponent = DataMatrixScanner,
  onManualRetry,
}: DataMatrixAgentConsoleProps) {
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus>('idle');
  const [currentAction, setCurrentAction] = useState<DataMatrixAction | null>(
    null,
  );
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [latestState, setLatestState] = useState<ActionExecutorState | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [localDeterministicCards, setLocalDeterministicCards] = useState<
    DataMatrixDeterministicCard[]
  >([]);
  const [localTimelineEvents, setLocalTimelineEvents] = useState<
    DataMatrixTimelineEvent[]
  >([]);

  const deterministicCardsFromScanRoutes = useMemo(
    () =>
      externalScanRoutes
        .filter(
          (route): route is ScanRouteDeterministicResult =>
            route.lane === 'deterministic',
        )
        .map((route) => toDeterministicCardFromScanRoute(route)),
    [externalScanRoutes],
  );

  const timelineEventsFromContractFeeds = useMemo(
    () => [
      ...externalScanRoutes.map((route) => toTimelineEventFromScanRoute(route)),
      ...externalSchedulerEvents.map((event) =>
        toTimelineEventFromSchedulerEvent(event),
      ),
      ...externalDeviceCallbacks.map((callback) =>
        toTimelineEventFromDeviceCallback(callback),
      ),
      ...externalObservabilityEvents.map((event) =>
        toTimelineEventFromObservabilityEvent(event),
      ),
    ],
    [
      externalDeviceCallbacks,
      externalObservabilityEvents,
      externalScanRoutes,
      externalSchedulerEvents,
    ],
  );

  const combinedDeterministicCards = useMemo(
    () =>
      toRecentFirst(
        dedupeById([
          ...localDeterministicCards,
          ...deterministicCardsFromScanRoutes,
          ...externalDeterministicCards,
        ]),
        MAX_DETERMINISTIC_CARDS,
      ),
    [
      deterministicCardsFromScanRoutes,
      externalDeterministicCards,
      localDeterministicCards,
    ],
  );

  const combinedTimelineEvents = useMemo(
    () =>
      toRecentFirst(
        dedupeById([
          ...localTimelineEvents,
          ...externalTimelineEvents,
          ...timelineEventsFromContractFeeds,
        ]),
        MAX_TIMELINE_EVENTS,
      ),
    [
      externalTimelineEvents,
      localTimelineEvents,
      timelineEventsFromContractFeeds,
    ],
  );

  const canRetry = Boolean(currentAction) && executionStatus !== 'executing';

  const appendTimelineEvent = (event: DataMatrixTimelineEvent) => {
    setLocalTimelineEvents((previous) =>
      toRecentFirst(dedupeById([...previous, event]), MAX_TIMELINE_EVENTS),
    );
  };

  const ingestHistoryEvents = (
    runId: string,
    history: ActionExecutorState['history'],
  ) => {
    setLocalTimelineEvents((previous) => {
      const existingIds = new Set(previous.map((event) => event.id));
      const additions: DataMatrixTimelineEvent[] = [];

      for (const entry of history) {
        const id = toHistoryEventId(runId, entry);
        if (existingIds.has(id)) continue;
        existingIds.add(id);
        additions.push({
          id,
          runId,
          occurredAt: entry.timestamp,
          source: 'executor',
          phase: 'step',
          status: entry.status,
          message: toHistoryMessage(entry.action),
        });
      }

      return toRecentFirst(
        dedupeById([...previous, ...additions]),
        MAX_TIMELINE_EVENTS,
      );
    });
  };

  const executeAction = (
    action: DataMatrixAction,
    source: 'scan' | 'manual-retry',
  ) => {
    const runId = createRunId();
    const startedAt = Date.now();
    const deterministicCard = buildDeterministicCard(action, runId, source);

    setCurrentAction(action);
    setCurrentRunId(runId);
    setExecutionStatus('executing');
    setLatestState(null);
    setLocalDeterministicCards((previous) =>
      toRecentFirst([deterministicCard, ...previous], MAX_DETERMINISTIC_CARDS),
    );

    appendTimelineEvent({
      id: `scan:${runId}`,
      runId,
      occurredAt: startedAt,
      source: 'scan-router',
      phase: 'scan',
      status: 'completed',
      message:
        source === 'manual-retry'
          ? 'Manual retry acknowledged by deterministic lane'
          : 'Scan routed by deterministic lane',
      detail: `parser=${deterministicCard.parserCode}`,
    });
    appendTimelineEvent({
      id: `run:${runId}:pending`,
      runId,
      occurredAt: startedAt + 1,
      source: 'scheduler',
      phase: 'run',
      status: 'started',
      message: 'Run started',
      detail: `action=${action.action}`,
    });

    const executor = createExecutor(action);
    executor.onProgress((state) => {
      setLatestState(state);
      if (state.phase === 'error') {
        setExecutionStatus('error');
      } else if (state.phase === 'completed') {
        setExecutionStatus('completed');
      } else {
        setExecutionStatus('executing');
      }
      ingestHistoryEvents(runId, state.history);
    });
    executor.onError((error) => {
      setExecutionStatus('error');
      appendTimelineEvent({
        id: `run:${runId}:error`,
        runId,
        occurredAt: Date.now(),
        source: 'scheduler',
        phase: 'run',
        status: 'failed',
        message: 'Run failed',
        detail: error.message,
      });
      toast.error(`DataMatrix run failed: ${error.message}`);
    });

    executor
      .execute()
      .then(() => {
        setExecutionStatus('completed');
        appendTimelineEvent({
          id: `run:${runId}:complete`,
          runId,
          occurredAt: Date.now(),
          source: 'scheduler',
          phase: 'run',
          status: 'completed',
          message: 'Run completed',
          detail: `durationMs=${Date.now() - startedAt}`,
        });
      })
      .catch(() => {
        // Error state already surfaced via onError.
      });
  };

  const handleActionDetected = (action: DataMatrixAction) => {
    executeAction(action, 'scan');
  };

  const handleFallbackRouted = (result: ScanRouteFallbackResult) => {
    appendTimelineEvent(toTimelineEventFromScanRoute(result));
  };

  const handleManualRetry = () => {
    if (!currentAction) return;

    onManualRetry?.({
      action: currentAction,
      previousRunId: currentRunId,
    });

    appendTimelineEvent({
      id: `ui:retry:${Date.now()}`,
      runId: currentRunId ?? 'none',
      occurredAt: Date.now(),
      source: 'ui',
      phase: 'system',
      status: 'started',
      message: 'Manual retry requested',
    });

    executeAction(currentAction, 'manual-retry');
  };

  const handleConsoleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const key = event.key.toLowerCase();
    if (key === 'r' && canRetry) {
      event.preventDefault();
      handleManualRetry();
    }
    if (key === 'd') {
      event.preventDefault();
      setShowDetails((current) => !current);
    }
  };

  return (
    <section
      className="space-y-6"
      onKeyDown={handleConsoleKeyDown}
      aria-keyshortcuts="r,d"
      aria-label="DataMatrix Agent Console"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ScanLine className="size-5 text-primary" />
              DataMatrix Agent Console
            </CardTitle>
            <CardDescription>
              Deterministic scan routing, local context capture, and timeline
              playback for DataMatrix execution runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScannerComponent
              onActionDetected={handleActionDetected}
              onFallbackRouted={handleFallbackRouted}
              showScanResults={false}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              Runtime Controls
            </CardTitle>
            <CardDescription>
              Keyboard: <kbd className="rounded border px-1.5 py-0.5">R</kbd> to
              retry and <kbd className="rounded border px-1.5 py-0.5">D</kbd> to
              toggle details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 font-medium capitalize">{executionStatus}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Active Run
                </p>
                <p className="mt-1 truncate font-medium">
                  {currentRunId ?? 'none'}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Context Capture
              </p>
              <p className="text-sm">
                Business:{' '}
                <span className="font-medium">{businessSlug ?? '-'}</span>
              </p>
              <p className="text-sm">
                Action:{' '}
                <span className="font-medium">
                  {currentAction?.action ?? 'No action selected'}
                </span>
              </p>
              <p className="text-sm">
                History events:{' '}
                <span className="font-medium">
                  {latestState?.history.length ?? 0}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleManualRetry} disabled={!canRetry}>
                <RotateCcw className="mr-2 size-4" />
                Retry Run
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetails((current) => !current)}
              >
                {showDetails ? (
                  <EyeOff className="mr-2 size-4" />
                ) : (
                  <Eye className="mr-2 size-4" />
                )}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocalTimelineEvents([])}
                disabled={localTimelineEvents.length === 0}
              >
                <Trash2 className="mr-2 size-4" />
                Clear Local Timeline
              </Button>
            </div>

            {showDetails && (
              <div className="space-y-3 rounded-lg border border-dashed border-border/80 p-3">
                <p className="text-sm font-medium">Action Payload</p>
                <pre className="max-h-44 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(currentAction, null, 2) ?? 'null'}
                </pre>
                <p className="text-sm font-medium">Executor Context Snapshot</p>
                <pre className="max-h-44 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(
                    {
                      phase: latestState?.phase ?? null,
                      context: latestState?.context ?? null,
                      permissions: latestState?.permissions ?? [],
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              Deterministic Scan Responses
            </CardTitle>
            <CardDescription>
              Parser outcomes from deterministic lane routing (no LLM required).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {combinedDeterministicCards.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Waiting for deterministic scan responses. Scan a DataMatrix code
                to populate this feed.
              </p>
            ) : (
              combinedDeterministicCards.map((card) => (
                <article
                  key={card.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        card.lane === 'deterministic' ? 'default' : 'outline'
                      }
                    >
                      {card.lane}
                    </Badge>
                    <Badge variant="secondary">{card.actionType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      parser:{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                        {card.parserCode}
                      </code>
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{card.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>run: {card.runId}</span>
                    <span>
                      {new Date(card.occurredAt).toLocaleTimeString()}
                    </span>
                    {Object.entries(card.metadata ?? {}).map(([key, value]) => (
                      <span key={key}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-primary" />
              Execution Timeline
            </CardTitle>
            <CardDescription>
              Unified run/step events from scheduler, executor, bridge, and
              observability feeds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {combinedTimelineEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Timeline is empty. Trigger a scan or feed scheduler/bridge logs
                through external event props.
              </p>
            ) : (
              <ol className="max-h-[460px] space-y-2 overflow-auto pr-1">
                {combinedTimelineEvents.map((event) => (
                  <li
                    key={event.id}
                    className={cn(
                      'rounded-lg border border-border/60 p-3',
                      event.status === 'failed' &&
                        'border-destructive/60 bg-destructive/5',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={toStatusTone(event.status)}>
                        {event.status}
                      </Badge>
                      <Badge variant="outline">{event.source}</Badge>
                      <Badge variant="outline">{event.phase}</Badge>
                      <span className="text-xs text-muted-foreground">
                        run: {event.runId}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{event.message}</p>
                    {event.detail ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.detail}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
