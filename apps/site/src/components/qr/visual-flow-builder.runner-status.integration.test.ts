import { describe, expect, it, vi } from 'vitest';
import type { DataMatrixAction } from '@/lib/datamatrix';

import {
  executeWorkflowWithStatusTransitions,
  type RunnerStatusNode,
} from './visual-flow-builder';

function createNavigateAction(): DataMatrixAction {
  return {
    version: '1.0',
    action: 'navigate',
    navigation: {
      url: 'https://supersurkhet.com/welcome',
    },
  };
}

function createNodes(): RunnerStatusNode[] {
  return [
    {
      id: 'runner-1',
      type: 'runner',
      data: {
        label: 'Runner',
        status: 'initial',
      },
    },
    {
      id: 'navigate-1',
      type: 'navigate',
      data: {
        label: 'Navigate',
        status: 'initial',
      },
    },
    {
      id: 'wifi-1',
      type: 'wifiConnect',
      data: {
        label: 'WiFi',
        status: 'initial',
      },
    },
  ];
}

describe('visual-flow-builder runner status transitions', () => {
  it('transitions involved nodes from loading to success on execution success', async () => {
    const snapshots: RunnerStatusNode[][] = [];
    let nodes = createNodes();

    const setNodes = (
      updater: (current: RunnerStatusNode[]) => RunnerStatusNode[],
    ) => {
      nodes = updater(nodes);
      snapshots.push(structuredClone(nodes));
    };

    let resolveExecution: () => void = () => undefined;
    const executeAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveExecution = resolve;
        }),
    );

    const execution = executeWorkflowWithStatusTransitions({
      action: createNavigateAction(),
      nodes,
      setNodes,
      executeAction,
    });

    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(
      snapshots[0]?.find((node) => node.id === 'runner-1')?.data.status,
    ).toBe('loading');
    expect(
      snapshots[0]?.find((node) => node.id === 'navigate-1')?.data.status,
    ).toBe('loading');
    expect(
      snapshots[0]?.find((node) => node.id === 'wifi-1')?.data.status,
    ).toBe('initial');

    resolveExecution();
    await execution;

    expect(
      snapshots.at(-1)?.find((node) => node.id === 'runner-1')?.data.status,
    ).toBe('success');
    expect(
      snapshots.at(-1)?.find((node) => node.id === 'navigate-1')?.data.status,
    ).toBe('success');
  });

  it('transitions involved nodes to error when execution fails', async () => {
    let nodes = createNodes();

    const setNodes = (
      updater: (current: RunnerStatusNode[]) => RunnerStatusNode[],
    ) => {
      nodes = updater(nodes);
    };

    const executeAction = vi.fn(async () => {
      throw new Error('execution failed');
    });

    await expect(
      executeWorkflowWithStatusTransitions({
        action: createNavigateAction(),
        nodes,
        setNodes,
        executeAction,
      }),
    ).rejects.toThrow('execution failed');

    expect(nodes.find((node) => node.id === 'runner-1')?.data.status).toBe(
      'error',
    );
    expect(nodes.find((node) => node.id === 'navigate-1')?.data.status).toBe(
      'error',
    );
    expect(nodes.find((node) => node.id === 'wifi-1')?.data.status).toBe(
      'initial',
    );
  });
});
