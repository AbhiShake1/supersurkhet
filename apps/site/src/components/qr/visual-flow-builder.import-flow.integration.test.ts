import { describe, expect, it, vi } from 'vitest';
import type { DataMatrixAction } from '@/lib/datamatrix';

import { buildFlowGraphFromAction } from './visual-flow-builder';

describe('visual-flow-builder import flow conversion', () => {
  it('builds a sequential node graph from a DataMatrix action payload', () => {
    const action: DataMatrixAction = {
      version: '1.0',
      action: 'wifi_connect',
      wifi: {
        ssid: 'CafeWifi',
        password: 'secret',
        security: 'WPA2',
      },
      post_connect: {
        notification: {
          title: 'Connected',
          message: 'Welcome online',
        },
      },
      on_complete: {
        type: 'navigate',
        url: 'https://supersurkhet.com/menu',
      },
    };

    const graph = buildFlowGraphFromAction(action, vi.fn());

    expect(graph.nodes.map((node) => node.type)).toEqual([
      'wifiConnect',
      'notification',
      'navigate',
      'runner',
    ]);
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges[0]).toEqual(
      expect.objectContaining({
        source: graph.nodes[0]?.id,
        target: graph.nodes[1]?.id,
      }),
    );
    expect(graph.edges[2]).toEqual(
      expect.objectContaining({
        source: graph.nodes[2]?.id,
        target: graph.nodes[3]?.id,
      }),
    );
  });
});
