import { describe, expect, it } from 'vitest';

import {
  adaptV2EngineDefinitionToLegacyAction,
  buildDataMatrixActionFromFlowGraph,
  buildDataMatrixActionFromFlowNodes,
  compileFlowBuilderToV2EngineDefinition,
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

describe('compileFlowBuilderToV2EngineDefinition', () => {
  it('compiles supported reachable nodes into deterministic qr engine node/edge order', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'runner-1',
        type: 'runner',
        data: {
          config: {
            mode: 'sequential',
          },
        },
      },
      {
        id: 'wifi-1',
        type: 'wifiConnect',
        data: {
          config: {
            ssid: 'CafeWifi',
            password: 'secret',
            security: 'WPA2',
          },
        },
      },
      {
        id: 'notification-1',
        type: 'notification',
        data: {
          config: {
            title: 'Connected',
            message: 'Welcome online',
          },
        },
      },
      {
        id: 'navigate-1',
        type: 'navigate',
        data: {
          config: {
            url: 'https://supersurkhet.com/menu',
          },
        },
      },
    ];

    const edges: FlowBuilderEdge[] = [
      {
        source: 'wifi-1',
        target: 'notification-1',
      },
      {
        source: 'notification-1',
        target: 'navigate-1',
      },
      {
        source: 'wifi-1',
        target: 'missing-node',
      },
    ];

    const result = compileFlowBuilderToV2EngineDefinition(nodes, edges);

    expect(result.errors).toEqual([]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'FLOW_EDGE_WITH_MISSING_NODE',
      'FLOW_UNSUPPORTED_NODE_TYPE',
    ]);
    expect(result.engineDefinition?.schemaVersion).toBe('2');
    expect(result.engineDefinition?.engineId).toBe('datamatrix.flow-builder');
    expect(result.engineDefinition?.entryNodeId).toBe('wifi-1');
    expect(result.engineDefinition?.metadata).toEqual(
      expect.objectContaining({
        flowBuilderOrderedNodeIds: ['wifi-1', 'notification-1', 'navigate-1'],
      }),
    );
    expect(result.engineDefinition?.nodes.map((node) => node.nodeId)).toEqual([
      'wifi-1',
      'notification-1',
      'navigate-1',
    ]);
    expect(result.engineDefinition?.nodes).toEqual([
      expect.objectContaining({
        nodeId: 'wifi-1',
        actionId: 'datamatrix.wifi_connect',
        metadata: expect.objectContaining({
          flowBuilderNodeType: 'wifiConnect',
        }),
      }),
      expect.objectContaining({
        nodeId: 'notification-1',
        actionId: 'datamatrix.notification',
        metadata: expect.objectContaining({
          flowBuilderNodeType: 'notification',
        }),
      }),
      expect.objectContaining({
        nodeId: 'navigate-1',
        actionId: 'datamatrix.navigate',
        metadata: expect.objectContaining({
          flowBuilderNodeType: 'navigate',
        }),
      }),
    ]);
    expect(result.engineDefinition?.edges).toEqual([
      {
        from: 'wifi-1',
        to: 'notification-1',
        on: 'success',
      },
      {
        from: 'notification-1',
        to: 'navigate-1',
        on: 'success',
      },
    ]);
    expect(result.legacyAction).toEqual(
      expect.objectContaining({
        action: 'wifi_connect',
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
      }),
    );
  });

  it('returns coded errors for cyclic flows', () => {
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

    const result = compileFlowBuilderToV2EngineDefinition(nodes, edges);

    expect(result.engineDefinition).toBeNull();
    expect(result.legacyAction).toBeNull();
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'FLOW_CYCLE',
      }),
    ]);
    expect(result.errors[0]?.message).toContain('Flow contains a cycle');
  });

  it('returns schema validation error code when compiled engine payload is invalid', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: '',
        type: 'wifiConnect',
        data: {
          config: {
            ssid: 'CafeWifi',
            password: 'secret',
          },
        },
      },
    ];

    const result = compileFlowBuilderToV2EngineDefinition(nodes, []);

    expect(result.engineDefinition).toBeNull();
    expect(result.legacyAction).toBeNull();
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'FLOW_V2_ENGINE_SCHEMA_INVALID',
      }),
    ]);
  });

  it('reports missing executable nodes with stable error codes', () => {
    const nodes: FlowBuilderNode[] = [
      {
        id: 'navigate-1',
        type: 'navigate',
        data: {
          config: {},
        },
      },
      {
        id: 'runner-1',
        type: 'runner',
        data: {
          config: {
            mode: 'sequential',
          },
        },
      },
    ];

    const result = compileFlowBuilderToV2EngineDefinition(nodes, []);

    expect(result.engineDefinition).toBeNull();
    expect(result.legacyAction).toBeNull();
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'FLOW_NO_EXECUTABLE_NODE',
      }),
    ]);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'FLOW_NODE_NOT_CONFIGURED',
      'FLOW_UNSUPPORTED_NODE_TYPE',
    ]);
  });

  it('preserves legacy adapter output parity with buildDataMatrixActionFromFlowGraph', () => {
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
        id: 'notification-1',
        type: 'notification',
        data: {
          config: {
            title: 'Connected',
            message: 'You are online',
          },
        },
      },
    ];
    const edges: FlowBuilderEdge[] = [
      {
        source: 'wifi-1',
        target: 'notification-1',
      },
    ];

    const compileResult = compileFlowBuilderToV2EngineDefinition(nodes, edges);
    const legacyResult = buildDataMatrixActionFromFlowGraph(nodes, edges);

    expect(compileResult.errors).toEqual([]);
    expect(compileResult.legacyAction).not.toBeNull();
    expect(legacyResult.action).toEqual(compileResult.legacyAction);
    expect(legacyResult.errors).toEqual([]);
  });

  it('adapts canonical v2 engine definitions when node metadata is missing', () => {
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
        id: 'notification-1',
        type: 'notification',
        data: {
          config: {
            title: 'Connected',
            message: 'Welcome online',
          },
        },
      },
    ];
    const edges: FlowBuilderEdge[] = [
      {
        source: 'wifi-1',
        target: 'notification-1',
      },
    ];

    const compileResult = compileFlowBuilderToV2EngineDefinition(nodes, edges);
    expect(compileResult.errors).toEqual([]);
    expect(compileResult.engineDefinition).not.toBeNull();
    if (!compileResult.engineDefinition) {
      throw new Error('Expected engine definition to exist');
    }

    const metadataFreeEngineDefinition = {
      ...compileResult.engineDefinition,
      nodes: compileResult.engineDefinition.nodes.map((node) => ({
        ...node,
        metadata: undefined,
      })),
    };

    const adapted = adaptV2EngineDefinitionToLegacyAction(
      metadataFreeEngineDefinition,
    );

    expect(adapted.errors).toEqual([]);
    expect(adapted.action).toEqual(compileResult.legacyAction);
  });

  it('adapts legacy v2 workflow payloads for backward compatibility', () => {
    const legacyV2Payload = {
      version: '2.0' as const,
      engineId: 'datamatrix.flow-builder' as const,
      primaryNodeId: 'navigate-1',
      orderedNodeIds: ['navigate-1'],
      workflow: {
        nodes: [
          {
            nodeId: 'navigate-1',
            kind: 'action' as const,
            actionId: 'datamatrix.navigate' as const,
            nodeType: 'navigate' as const,
            input: {
              url: 'https://supersurkhet.com/menu',
            },
          },
        ],
        edges: [],
      },
    };

    const adapted = adaptV2EngineDefinitionToLegacyAction(legacyV2Payload);

    expect(adapted.errors).toEqual([]);
    expect(adapted.action).toEqual(
      expect.objectContaining({
        action: 'navigate',
        navigation: expect.objectContaining({
          url: 'https://supersurkhet.com/menu',
        }),
      }),
    );
  });
});
