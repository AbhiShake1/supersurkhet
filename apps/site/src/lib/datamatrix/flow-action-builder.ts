import {
  type DataMatrixAction,
  dataMatrixActionSchema,
} from '@/lib/datamatrix';

export interface FlowBuilderNode {
  id: string;
  type: string;
  data?: {
    config?: Record<string, unknown>;
  };
}

export interface FlowBuilderEdge {
  source: string;
  target: string;
}

export interface FlowActionBuildResult {
  action: DataMatrixAction | null;
  errors: string[];
}

type SupportedPrimaryNodeType =
  | 'wifiConnect'
  | 'profileEnrichment'
  | 'equipmentSession'
  | 'restaurantOrdering'
  | 'productInteraction'
  | 'navigate'
  | 'notification';

type NavigationParams = Record<string, string | number | boolean>;

const SUPPORTED_PRIMARY_NODE_TYPES = new Set<SupportedPrimaryNodeType>([
  'wifiConnect',
  'profileEnrichment',
  'equipmentSession',
  'restaurantOrdering',
  'productInteraction',
  'navigate',
  'notification',
]);

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  const parsed = Math.trunc(value);
  return parsed > 0 ? parsed : fallback;
}

function normalizeWifiSecurity(
  value: unknown,
): NonNullable<DataMatrixAction['wifi']>['security'] {
  const normalized = asString(value).toLowerCase();

  switch (normalized) {
    case 'wpa3':
      return 'WPA3';
    case 'wep':
      return 'WEP';
    case 'open':
      return 'open';
    default:
      return 'WPA2';
  }
}

function normalizeNavigationParams(
  value: unknown,
): NavigationParams | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const safeParams: Record<string, string | number | boolean> = {};

  for (const [key, paramValue] of Object.entries(value)) {
    if (
      typeof paramValue === 'string' ||
      typeof paramValue === 'number' ||
      typeof paramValue === 'boolean'
    ) {
      safeParams[key] = paramValue;
    }
  }

  return Object.keys(safeParams).length > 0 ? safeParams : undefined;
}

function isConfiguredNode(
  type: SupportedPrimaryNodeType,
  config: Record<string, unknown> | undefined,
): boolean {
  if (!config) {
    return false;
  }

  switch (type) {
    case 'wifiConnect':
      return asString(config.ssid).length > 0;
    case 'profileEnrichment':
      return asString(config.field).length > 0;
    case 'equipmentSession':
      return asString(config.equipmentId).length > 0;
    case 'restaurantOrdering':
      return asString(config.restaurantId).length > 0;
    case 'productInteraction':
      return (
        asString(config.productId).length > 0 && asString(config.sku).length > 0
      );
    case 'navigate':
      return asString(config.url).length > 0;
    case 'notification':
      return (
        asString(config.title).length > 0 || asString(config.message).length > 0
      );
    default:
      return false;
  }
}

function findConfiguredNode(
  nodes: readonly FlowBuilderNode[],
  type: SupportedPrimaryNodeType,
): FlowBuilderNode | undefined {
  return nodes.find(
    (node) => node.type === type && isConfiguredNode(type, node.data?.config),
  );
}

function isSupportedPrimaryNodeType(
  type: string,
): type is SupportedPrimaryNodeType {
  return SUPPORTED_PRIMARY_NODE_TYPES.has(type as SupportedPrimaryNodeType);
}

type TopologyResult = {
  orderedNodes: FlowBuilderNode[];
  hasCycle: boolean;
};

function getTopologicallyOrderedNodes(
  nodes: readonly FlowBuilderNode[],
  edges: readonly FlowBuilderEdge[],
): TopologyResult {
  if (nodes.length <= 1 || edges.length === 0) {
    return { orderedNodes: [...nodes], hasCycle: false };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeIndexById = new Map(
    nodes.map((node, index) => [node.id, index] as const),
  );
  const indegreeById = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));

  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      continue;
    }

    const sourceTargets = adjacency.get(edge.source);
    if (!sourceTargets || sourceTargets.has(edge.target)) {
      continue;
    }

    sourceTargets.add(edge.target);
    indegreeById.set(edge.target, (indegreeById.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes
    .filter((node) => (indegreeById.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const orderedNodeIds: string[] = [];

  while (queue.length > 0) {
    queue.sort(
      (left, right) =>
        (nodeIndexById.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (nodeIndexById.get(right) ?? Number.MAX_SAFE_INTEGER),
    );

    const currentId = queue.shift();
    if (!currentId) {
      break;
    }

    orderedNodeIds.push(currentId);
    const neighbors = adjacency.get(currentId);
    if (!neighbors) {
      continue;
    }

    for (const neighborId of neighbors) {
      const nextInDegree = (indegreeById.get(neighborId) ?? 0) - 1;
      indegreeById.set(neighborId, nextInDegree);
      if (nextInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  if (orderedNodeIds.length === nodes.length) {
    return {
      orderedNodes: orderedNodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is FlowBuilderNode => Boolean(node)),
      hasCycle: false,
    };
  }

  const orderedSet = new Set(orderedNodeIds);
  const remaining = nodes
    .filter((node) => !orderedSet.has(node.id))
    .map((node) => node.id);

  const combinedOrder = [...orderedNodeIds, ...remaining];
  const orderedNodes = combinedOrder
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is FlowBuilderNode => Boolean(node));

  return {
    orderedNodes,
    hasCycle: orderedNodeIds.length !== nodes.length,
  };
}

function getReachableNodeIds(
  startNodeId: string,
  edges: readonly FlowBuilderEdge[],
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const stack: string[] = [startNodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return visited;
}

function getTraversalNodesFromPrimary(
  orderedNodes: readonly FlowBuilderNode[],
  primaryNodeId: string,
  edges: readonly FlowBuilderEdge[],
): FlowBuilderNode[] {
  if (edges.length === 0) {
    return [...orderedNodes];
  }

  const reachableNodeIds = getReachableNodeIds(primaryNodeId, edges);
  return orderedNodes.filter((node) => reachableNodeIds.has(node.id));
}

function resolveNavigateConfig(
  node: FlowBuilderNode | undefined,
): DataMatrixAction['navigation'] | null {
  const config = node?.data?.config;
  if (!config) {
    return null;
  }

  const url = asString(config.url);
  if (!url) {
    return null;
  }

  return {
    url,
    params: normalizeNavigationParams(config.params),
  };
}

function resolveNotificationConfig(
  node: FlowBuilderNode | undefined,
): NonNullable<DataMatrixAction['post_connect']>['notification'] | null {
  const config = node?.data?.config;
  if (!config) {
    return null;
  }

  return resolveNotification(config);
}

function applyWifiConnectAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  action.action = 'wifi_connect';
  action.wifi = {
    ssid: asString(config.ssid),
    password: asString(config.password),
    security: normalizeWifiSecurity(config.security),
  };
}

function applyProfileEnrichmentAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  const field = asString(config.field);
  const label = asString(config.fieldLabel) || field;
  const required = asBoolean(config.required, true);
  const missingType =
    asString(config.ifMissingType) === 'choice_selection'
      ? 'choice_selection'
      : 'form_request';

  action.action = 'profile_enrichment';
  action.checks = [
    {
      field,
      required,
      if_missing:
        missingType === 'form_request'
          ? {
              type: 'form_request',
              schema: {
                title: 'Complete your profile',
                fields: [
                  {
                    name: field,
                    type: 'text',
                    required,
                    label,
                  },
                ],
              },
            }
          : {
              type: 'choice_selection',
              multiple: false,
            },
    },
  ];
}

function applyEquipmentSessionAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  const duration = asPositiveInteger(config.duration, 30);
  const maxDuration = asPositiveInteger(config.maxDuration, duration);

  action.action = 'equipment_session';
  action.equipment = {
    id: asString(config.equipmentId),
    type: asString(config.equipmentType) || 'generic',
    location: asString(config.location) || 'from_context',
  };
  action.session = {
    duration,
    max_duration: maxDuration,
    extendable: asBoolean(config.extendable, true),
  };
  action.actions = {
    on_start: {
      type: 'equipment_control',
      command: 'activate',
    },
    on_end: {
      type: 'equipment_control',
      command: 'deactivate',
    },
  };
}

function applyRestaurantOrderingAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  action.action = 'restaurant_ordering';
  action.restaurant = {
    id: asString(config.restaurantId),
    table: asString(config.table) || 'from_context',
  };
  action.flow = {
    steps: [
      { step: 1, type: 'menu_display' },
      { step: 2, type: 'order_building' },
      { step: 3, type: 'order_confirmation' },
      { step: 4, type: 'payment_selection' },
    ],
  };
}

function applyProductInteractionAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  action.action = 'product_interaction';
  action.product = {
    id: asString(config.productId),
    sku: asString(config.sku),
  };
  action.interactions = {
    info: {
      type: 'product_details',
      sections: ['overview', 'specifications', 'pricing'],
    },
  };
}

function applyNavigateAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  action.action = 'navigate';
  action.navigation = {
    url: asString(config.url),
    params: normalizeNavigationParams(config.params),
  };
}

function resolveNotification(
  config: Record<string, unknown>,
): NonNullable<DataMatrixAction['post_connect']>['notification'] {
  const title = asString(config.title) || 'Notification';
  const message = asString(config.message) || 'New update available.';

  return {
    title,
    message,
  };
}

function applyNotificationAction(
  action: Partial<DataMatrixAction>,
  config: Record<string, unknown>,
): void {
  action.action = 'notification';
  action.post_connect = {
    notification: resolveNotification(config),
  };
}

function applyOptionalLinkedNodes(
  action: Partial<DataMatrixAction>,
  traversalNodes: readonly FlowBuilderNode[],
  primaryNodeId: string,
): void {
  const primaryIndex = traversalNodes.findIndex(
    (node) => node.id === primaryNodeId,
  );
  const downstreamNodes =
    primaryIndex >= 0
      ? traversalNodes.slice(primaryIndex + 1)
      : [...traversalNodes];

  const downstreamNotificationNode = findConfiguredNode(
    downstreamNodes,
    'notification',
  );
  const downstreamNavigateNode = findConfiguredNode(
    downstreamNodes,
    'navigate',
  );

  const downstreamNotification = resolveNotificationConfig(
    downstreamNotificationNode,
  );
  if (downstreamNotification) {
    action.post_connect = {
      notification: downstreamNotification,
    };
  }

  const downstreamNavigation = resolveNavigateConfig(downstreamNavigateNode);
  if (downstreamNavigation && action.action === 'navigate') {
    action.navigation = downstreamNavigation;
  }

  if (action.action !== 'navigate' && downstreamNavigation?.url) {
    action.on_complete = {
      type: 'navigate',
      url: downstreamNavigation.url,
    };
  } else if (
    action.action !== 'notification' &&
    action.post_connect?.notification?.message
  ) {
    action.on_complete = {
      type: 'notification',
      message: action.post_connect.notification.message,
    };
  }
}

function applyPrimaryAction(
  action: Partial<DataMatrixAction>,
  node: FlowBuilderNode,
): void {
  const config = node.data?.config;
  if (!config) {
    return;
  }

  switch (node.type) {
    case 'wifiConnect':
      applyWifiConnectAction(action, config);
      return;
    case 'profileEnrichment':
      applyProfileEnrichmentAction(action, config);
      return;
    case 'equipmentSession':
      applyEquipmentSessionAction(action, config);
      return;
    case 'restaurantOrdering':
      applyRestaurantOrderingAction(action, config);
      return;
    case 'productInteraction':
      applyProductInteractionAction(action, config);
      return;
    case 'navigate':
      applyNavigateAction(action, config);
      return;
    case 'notification':
      applyNotificationAction(action, config);
      return;
    default:
      return;
  }
}

export function buildDataMatrixActionFromFlowNodes(
  nodes: readonly FlowBuilderNode[],
  edges: readonly FlowBuilderEdge[] = [],
): DataMatrixAction | null {
  return buildDataMatrixActionFromFlowGraph(nodes, edges).action;
}

export function buildDataMatrixActionFromFlowGraph(
  nodes: readonly FlowBuilderNode[],
  edges: readonly FlowBuilderEdge[] = [],
): FlowActionBuildResult {
  if (nodes.length === 0) {
    return {
      action: null,
      errors: ['Flow is empty. Add at least one executable node.'],
    };
  }

  const { orderedNodes, hasCycle } = getTopologicallyOrderedNodes(nodes, edges);
  if (hasCycle) {
    return {
      action: null,
      errors: [
        'Flow contains a cycle. Remove cyclic edges so execution order is deterministic.',
      ],
    };
  }

  const primaryNode = orderedNodes.find((node) => {
    if (!isSupportedPrimaryNodeType(node.type)) {
      return false;
    }

    return isConfiguredNode(node.type, node.data?.config);
  });

  if (!primaryNode) {
    return {
      action: null,
      errors: ['No configured executable action node found in the flow.'],
    };
  }

  const action: Partial<DataMatrixAction> = {
    version: '1.0',
  };

  const traversalNodes = getTraversalNodesFromPrimary(
    orderedNodes,
    primaryNode.id,
    edges,
  );
  applyPrimaryAction(action, primaryNode);
  applyOptionalLinkedNodes(action, traversalNodes, primaryNode.id);

  try {
    return {
      action: dataMatrixActionSchema.parse(action),
      errors: [],
    };
  } catch (error) {
    return {
      action: null,
      errors: [
        error instanceof Error
          ? `Action schema validation failed: ${error.message}`
          : 'Action schema validation failed.',
      ],
    };
  }
}
