// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataMatrixAction } from '@/lib/datamatrix';
import {
  DataMatrixAgentConsole,
  type DataMatrixAgentConsoleProps,
} from './datamatrix-agent-console';

afterEach(() => {
  cleanup();
});

function TriggerScanner({
  onActionDetected,
}: {
  onActionDetected?: (action: DataMatrixAction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onActionDetected?.({
          version: '1.0',
          action: 'navigate',
          navigation: { url: 'https://example.com/checkout' },
        })
      }
    >
      Trigger Deterministic Scan
    </button>
  );
}

function PassiveScanner() {
  return <div>Passive scanner surface</div>;
}

function createSuccessfulExecutor(): NonNullable<
  DataMatrixAgentConsoleProps['createExecutor']
> {
  return () => {
    let onProgress:
      | ((state: {
          phase:
            | 'initial'
            | 'context_loading'
            | 'interactive'
            | 'completed'
            | 'error';
          context: Record<string, unknown>;
          userData: Record<string, unknown> | null;
          permissions: string[];
          history: Array<{
            timestamp: number;
            action: string;
            status: 'started' | 'completed' | 'failed' | 'skipped';
          }>;
        }) => void)
      | null = null;

    return {
      onProgress: (callback) => {
        onProgress = callback;
      },
      onError: () => {},
      execute: async () => {
        const startedAt = Date.now();
        onProgress?.({
          phase: 'initial',
          context: {},
          userData: null,
          permissions: [],
          history: [
            {
              timestamp: startedAt,
              action: 'execution_started',
              status: 'started',
            },
          ],
        });
        onProgress?.({
          phase: 'completed',
          context: { deterministic: true },
          userData: null,
          permissions: [],
          history: [
            {
              timestamp: startedAt,
              action: 'execution_started',
              status: 'started',
            },
            {
              timestamp: startedAt + 1,
              action: 'navigate',
              status: 'completed',
            },
            {
              timestamp: startedAt + 2,
              action: 'execution_completed',
              status: 'completed',
            },
          ],
        });
      },
    };
  };
}

describe('DataMatrixAgentConsole', () => {
  it('renders deterministic scan cards and timeline updates from executor history', async () => {
    render(
      <DataMatrixAgentConsole
        createExecutor={createSuccessfulExecutor()}
        ScannerComponent={TriggerScanner}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Deterministic Scan' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Deterministic lane accepted scan')).toBeTruthy();
    });

    expect(screen.getByText('parser:')).toBeTruthy();
    expect(screen.getByText('Run completed')).toBeTruthy();
    expect(screen.getByText('execution started')).toBeTruthy();
  });

  it('supports manual retry and records retry event in timeline', async () => {
    let executeCalls = 0;
    const createExecutor: NonNullable<
      DataMatrixAgentConsoleProps['createExecutor']
    > = () => {
      let onProgress:
        | ((state: {
            phase:
              | 'initial'
              | 'context_loading'
              | 'interactive'
              | 'completed'
              | 'error';
            context: Record<string, unknown>;
            userData: Record<string, unknown> | null;
            permissions: string[];
            history: Array<{
              timestamp: number;
              action: string;
              status: 'started' | 'completed' | 'failed' | 'skipped';
            }>;
          }) => void)
        | null = null;
      return {
        onProgress: (callback) => {
          onProgress = callback;
        },
        onError: () => {},
        execute: async () => {
          executeCalls += 1;
          const startedAt = Date.now();
          onProgress?.({
            phase: 'completed',
            context: {},
            userData: null,
            permissions: [],
            history: [
              {
                timestamp: startedAt,
                action: 'execution_started',
                status: 'started',
              },
              {
                timestamp: startedAt + 1,
                action: 'execution_completed',
                status: 'completed',
              },
            ],
          });
        },
      };
    };
    const onManualRetry = vi.fn();

    render(
      <DataMatrixAgentConsole
        createExecutor={createExecutor}
        ScannerComponent={TriggerScanner}
        onManualRetry={onManualRetry}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Deterministic Scan' }),
    );

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: 'Retry Run' });
      expect(retryButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry Run' }));

    await waitFor(() => {
      expect(screen.getByText('Manual retry requested')).toBeTruthy();
    });

    expect(onManualRetry).toHaveBeenCalledTimes(1);
    expect(executeCalls).toBe(2);
  });

  it('toggles details panel for payload inspection', async () => {
    render(
      <DataMatrixAgentConsole
        createExecutor={createSuccessfulExecutor()}
        ScannerComponent={TriggerScanner}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Deterministic Scan' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show Details' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show Details' }));

    expect(screen.getByText('Action Payload')).toBeTruthy();
    expect(screen.getByText(/"action": "navigate"/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Hide Details' }));

    await waitFor(() => {
      expect(screen.queryByText('Action Payload')).toBeNull();
    });
  });

  it('renders external scan/scheduler/device/observability feeds in deterministic cards and timeline', () => {
    render(
      <DataMatrixAgentConsole
        ScannerComponent={PassiveScanner}
        externalScanRoutes={[
          {
            routeId: 'scan-route-m8ep7d-abc123',
            lane: 'deterministic',
            source: 'signed_engine',
            outcome: 'executed',
            deterministicMessage: 'Signed engine payload accepted.',
            location: { status: 'stable', reason: 'gps-lock' },
            action: {
              version: '1.0',
              action: 'navigate',
              navigation: { url: 'https://example.com' },
            },
            payload: {
              version: '1.0',
              engineId: 'engine-1',
              workflowId: 'workflow-1',
            },
            metrics: {
              totalScans: 1,
              deterministicScans: 1,
              fallbackScans: 0,
              fallbackAiInvocations: 0,
              fallbackAiSuppressedByDedupe: 0,
              fallbackAiSuppressedByBudget: 0,
              parserErrors: {},
            },
          },
          {
            routeId: 'scan-route-m8ep7e-def123',
            lane: 'fallback',
            outcome: 'suppressed_deduped',
            parserErrorCode: 'invalid_json',
            parserErrorMessage: 'Payload is not valid JSON.',
            dedupeKey: 'session-a:hash-b',
            metrics: {
              totalScans: 2,
              deterministicScans: 1,
              fallbackScans: 1,
              fallbackAiInvocations: 0,
              fallbackAiSuppressedByDedupe: 1,
              fallbackAiSuppressedByBudget: 0,
              parserErrors: { invalid_json: 1 },
            },
          },
        ]}
        externalSchedulerEvents={[
          {
            id: 'scheduler-event-1',
            businessId: 'biz-1',
            schedulerId: 'scheduler-1',
            jobId: 'job-1',
            runId: 'run-1',
            level: 'info',
            eventType: 'datamatrix.run.completed',
            message: 'Scheduler run completed',
            createdAt: '2026-02-26T12:10:00.000Z',
          },
        ]}
        externalDeviceCallbacks={[
          {
            schemaVersion: '2026-02-26',
            runId: 'run-device-1',
            stepId: 'step-connect',
            attempt: 2,
            callbackId: 'cb-1',
            callbackAt: '2026-02-26T12:12:00.000Z',
            idempotencyKey: 'dm2:run-device-1:step-connect:2:cb-1',
            status: 'failed',
            runtime: {
              bridge: 'expo-webview',
              platform: 'android',
            },
            error: {
              code: 'wifi_timeout',
              message: 'Connection timed out',
              retryable: true,
            },
          },
        ]}
        externalObservabilityEvents={[
          {
            id: 'obs-event-1',
            jobId: 'job-obs-1',
            workflowId: 'workflow-obs-1',
            level: 'warn',
            eventType: 'retention.completed',
            message: 'Retention cycle completed',
            createdAt: '2026-02-26T12:15:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getAllByText('Signed engine payload accepted.').length).toBe(
      2,
    );
    expect(screen.getByText('dm2.router.signed_engine')).toBeTruthy();
    expect(screen.getByText('Fallback lane suppressed deduped')).toBeTruthy();
    expect(screen.getByText('Scheduler run completed')).toBeTruthy();
    expect(
      screen.getByText(
        'Device callback failed; retry scheduled for step "step-connect"',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Retention cycle completed')).toBeTruthy();
  });

  it('supports keyboard shortcuts for retry and details', async () => {
    render(
      <DataMatrixAgentConsole
        createExecutor={createSuccessfulExecutor()}
        ScannerComponent={TriggerScanner}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger Deterministic Scan' }),
    );

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: 'Retry Run' });
      expect(retryButton.hasAttribute('disabled')).toBe(false);
    });

    const consoleSection = screen.getByLabelText('DataMatrix Agent Console');

    fireEvent.keyDown(consoleSection, { key: 'd' });
    expect(screen.getByText('Action Payload')).toBeTruthy();

    fireEvent.keyDown(consoleSection, { key: 'd' });
    await waitFor(() => {
      expect(screen.queryByText('Action Payload')).toBeNull();
    });

    fireEvent.keyDown(consoleSection, { key: 'r' });
    await waitFor(() => {
      expect(screen.getByText('Manual retry requested')).toBeTruthy();
    });
  });
});
