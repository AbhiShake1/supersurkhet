import { describe, expect, it } from 'vitest';

import {
  buildDataMatrixActionFromFlowGraph,
  buildDataMatrixActionFromFlowNodes,
  type FlowBuilderEdge,
  type FlowBuilderNode,
} from './flow-action-builder';

describe('buildDataMatrixActionFromFlowNodes', () => {
  it('builds a navigate action when navigation node is configured', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'navigate-1',
        type: 'navigate',
        data: {
          config: {
            url: 'https://supersurkhet.com/menu',
            params: {
              source: 'qr',
              table: '7',
            },
          },
        },
      },
    ];

    const action = buildDataMatrixActionFromFlowNodes(nodes);

    expect(action).toEqual(
      expect.objectContaining({
        action: 'navigate',
        navigation: {
          url: 'https://supersurkhet.com/menu',
          params: {
            source: 'qr',
            table: '7',
          },
        },
      }),
    );
  });

  it('builds a product interaction action when product node is configured', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'product-1',
        type: 'productInteraction',
        data: {
          config: {
            productId: 'smart_watch_x1',
            sku: 'SW-X1-BLK-001',
          },
        },
      },
    ];

    const action = buildDataMatrixActionFromFlowNodes(nodes);

    expect(action).toEqual(
      expect.objectContaining({
        action: 'product_interaction',
        product: {
          id: 'smart_watch_x1',
          sku: 'SW-X1-BLK-001',
        },
      }),
    );
  });

  it('uses topological edge order to choose the primary action', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'wifi-1',
        type: 'wifiConnect',
        data: {
          config: {
            ssid: 'CafeWifi',
            password: 'secret',
          },
        },
      },
      {
        id: 'navigate-1',
        type: 'navigate',
        data: {
          config: {
            url: 'https://supersurkhet.com/landing',
          },
        },
      },
    ];

    const edges: FlowBuilderEdge[] = [
      {
        source: 'navigate-1',
        target: 'wifi-1',
      },
    ];

    const action = buildDataMatrixActionFromFlowNodes(nodes, edges);

    expect(action).toEqual(
      expect.objectContaining({
        action: 'navigate',
        navigation: expect.objectContaining({
          url: 'https://supersurkhet.com/landing',
        }),
      }),
    );
  });

  it('resolves linked secondary nodes only from the reachable path', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'wifi-1',
        type: 'wifiConnect',
        data: {
          config: {
            ssid: 'CafeWifi',
            password: 'secret',
          },
        },
      },
      {
        id: 'notification-reachable',
        type: 'notification',
        data: {
          config: {
            title: 'Connected',
            message: 'You are online',
          },
        },
      },
      {
        id: 'navigate-disconnected',
        type: 'navigate',
        data: {
          config: {
            url: 'https://supersurkhet.com/should-not-be-used',
          },
        },
      },
    ];

    const edges: FlowBuilderEdge[] = [
      {
        source: 'wifi-1',
        target: 'notification-reachable',
      },
    ];

    const action = buildDataMatrixActionFromFlowNodes(nodes, edges);

    expect(action).toEqual(
      expect.objectContaining({
        action: 'wifi_connect',
        post_connect: {
          notification: {
            title: 'Connected',
            message: 'You are online',
          },
        },
      }),
    );
    expect(action?.on_complete).toEqual(
      expect.objectContaining({
        type: 'notification',
      }),
    );
  });

  it('returns explicit validation errors when flow contains a cycle', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'wifi-1',
        type: 'wifiConnect',
        data: {
          config: {
            ssid: 'CafeWifi',
            password: 'secret',
          },
        },
      },
      {
        id: 'navigate-1',
        type: 'navigate',
        data: {
          config: {
            url: 'https://supersurkhet.com/landing',
          },
        },
      },
    ];

    const edges: FlowBuilderEdge[] = [
      {
        source: 'wifi-1',
        target: 'navigate-1',
      },
      {
        source: 'navigate-1',
        target: 'wifi-1',
      },
    ];

    const result = buildDataMatrixActionFromFlowGraph(nodes, edges);

    expect(result.action).toBeNull();
    expect(result.errors[0]).toContain('Flow contains a cycle');
  });
});
