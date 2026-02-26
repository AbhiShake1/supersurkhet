import {
  type DataMatrixAction,
  dataMatrixActionSchema,
  QR_ENGINE_DEFINITION_SCHEMA_VERSION,
  type QrEngineDefinition,
  type QrEngineEdge,
  type QrEngineNode,
  qrEngineDefinitionSchema,
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

export type FlowBuilderV2IssueCode =
  | 'FLOW_EMPTY'
  | 'FLOW_DUPLICATE_NODE_ID'
  | 'FLOW_CYCLE'
  | 'FLOW_NO_EXECUTABLE_NODE'
  | 'FLOW_EDGE_WITH_MISSING_NODE'
  | 'FLOW_UNSUPPORTED_NODE_TYPE'
  | 'FLOW_NODE_NOT_CONFIGURED'
  | 'FLOW_V2_ENGINE_SCHEMA_INVALID'
  | 'FLOW_LEGACY_ADAPTER_FAILED';

export interface FlowBuilderV2Issue {
  code: FlowBuilderV2IssueCode;
  message: string;
  path: string[];
}

type SupportedPrimaryNodeType =
  | 'wifiConnect'
  | 'profileEnrichment'
  | 'equipmentSession'
  | 'restaurantOrdering'
  | 'productInteraction'
  | 'navigate'
  | 'notification';

type FlowBuilderV2ActionId =
  | 'datamatrix.wifi_connect'
  | 'datamatrix.profile_enrichment'
  | 'datamatrix.equipment_session'
  | 'datamatrix.restaurant_ordering'
  | 'datamatrix.product_interaction'
  | 'datamatrix.navigate'
  | 'datamatrix.notification';

export interface LegacyFlowBuilderV2WorkflowNodeDefinition {
  nodeId: string;
  kind: 'action';
  actionId: FlowBuilderV2ActionId;
  nodeType: SupportedPrimaryNodeType;
  input: Record<string, unknown>;
}

export interface LegacyFlowBuilderV2WorkflowEdgeDefinition {
  from: string;
  to: string;
  on: 'success';
}

export interface LegacyFlowBuilderV2EngineDefinition {
  version: '2.0';
  engineId: 'datamatrix.flow-builder';
  primaryNodeId: string;
  orderedNodeIds: string[];
  workflow: {
    nodes: LegacyFlowBuilderV2WorkflowNodeDefinition[];
    edges: LegacyFlowBuilderV2WorkflowEdgeDefinition[];
  };
}

export type FlowBuilderV2EngineDefinition = QrEngineDefinition;

export interface FlowBuilderV2CompileResult {
  engineDefinition: FlowBuilderV2EngineDefinition | null;
  legacyAction: DataMatrixAction | null;
  errors: FlowBuilderV2Issue[];
  warnings: FlowBuilderV2Issue[];
}

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

const NODE_TYPE_TO_V2_ACTION_ID: Record<
  SupportedPrimaryNodeType,
  FlowBuilderV2ActionId
> = {
  wifiConnect: 'datamatrix.wifi_connect',
  profileEnrichment: 'datamatrix.profile_enrichment',
  equipmentSession: 'datamatrix.equipment_session',
  restaurantOrdering: 'datamatrix.restaurant_ordering',
  productInteraction: 'datamatrix.product_interaction',
  navigate: 'datamatrix.navigate',
  notification: 'datamatrix.notification',
};

const V2_ACTION_ID_TO_NODE_TYPE: Record<
  FlowBuilderV2ActionId,
  SupportedPrimaryNodeType
> = {
  'datamatrix.wifi_connect': 'wifiConnect',
  'datamatrix.profile_enrichment': 'profileEnrichment',
  'datamatrix.equipment_session': 'equipmentSession',
  'datamatrix.restaurant_ordering': 'restaurantOrdering',
  'datamatrix.product_interaction': 'productInteraction',
  'datamatrix.navigate': 'navigate',
  'datamatrix.notification': 'notification',
};

const FLOW_BUILDER_ENGINE_ID = 'datamatrix.flow-builder';
const FLOW_BUILDER_ENGINE_VERSION = '2.0.0';
const FLOW_BUILDER_BUSINESS_ID = 'flow-builder.local';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
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

function omitUndefinedProperties(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  );
}

function toIssue(
  code: FlowBuilderV2IssueCode,
  message: string,
  path: string[],
): FlowBuilderV2Issue {
  return {
    code,
    message,
    path,
  };
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

function isFlowBuilderV2ActionId(
  value: string,
): value is FlowBuilderV2ActionId {
  return value in V2_ACTION_ID_TO_NODE_TYPE;
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

function normalizeNodeConfigForV2(
  type: SupportedPrimaryNodeType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  switch (type) {
    case 'wifiConnect':
      return {
        ssid: asString(config.ssid),
        password: asString(config.password),
        security: normalizeWifiSecurity(config.security),
      };
    case 'profileEnrichment':
      return {
        field: asString(config.field),
        fieldLabel: asString(config.fieldLabel) || asString(config.field),
        required: asBoolean(config.required, true),
        ifMissingType:
          asString(config.ifMissingType) === 'choice_selection'
            ? 'choice_selection'
            : 'form_request',
      };
    case 'equipmentSession': {
      const duration = asPositiveInteger(config.duration, 30);
      return {
        equipmentId: asString(config.equipmentId),
        equipmentType: asString(config.equipmentType) || 'generic',
        location: asString(config.location) || 'from_context',
        duration,
        maxDuration: asPositiveInteger(config.maxDuration, duration),
        extendable: asBoolean(config.extendable, true),
      };
    }
    case 'restaurantOrdering':
      return {
        restaurantId: asString(config.restaurantId),
        table: asString(config.table) || 'from_context',
      };
    case 'productInteraction':
      return {
        productId: asString(config.productId),
        sku: asString(config.sku),
      };
    case 'navigate': {
      const params = normalizeNavigationParams(config.params);
      return {
        url: asString(config.url),
        ...(params ? { params } : {}),
      };
    }
    case 'notification':
      return {
        title: asString(config.title),
        message: asString(config.message),
      };
    default:
      return {};
  }
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

function toSupportedNodeTypeFromQrEngineNode(
  node: QrEngineNode,
): SupportedPrimaryNodeType | null {
  const metadata = asRecord(node.metadata);
  const metadataType = asString(metadata?.flowBuilderNodeType);
  if (isSupportedPrimaryNodeType(metadataType)) {
    return metadataType;
  }

  const actionId = asString(node.actionId);
  if (isFlowBuilderV2ActionId(actionId)) {
    return V2_ACTION_ID_TO_NODE_TYPE[actionId];
  }

  return null;
}

function adaptLegacyV2WorkflowDefinitionToLegacyAction(
  engineDefinition: LegacyFlowBuilderV2EngineDefinition,
): FlowActionBuildResult {
  const traversalNodes: FlowBuilderNode[] = engineDefinition.workflow.nodes.map(
    (node) => ({
      id: node.nodeId,
      type: node.nodeType,
      data: {
        config: node.input,
      },
    }),
  );

  return buildLegacyActionFromTraversalNodes(
    traversalNodes,
    engineDefinition.primaryNodeId,
  );
}

function adaptQrEngineDefinitionToLegacyAction(
  engineDefinition: QrEngineDefinition,
): FlowActionBuildResult {
  const flowNodes: FlowBuilderNode[] = engineDefinition.nodes.map((node) => {
    const resolvedNodeType = toSupportedNodeTypeFromQrEngineNode(node);

    return {
      id: node.nodeId,
      type: resolvedNodeType ?? '__unsupported_v2_node__',
      data: {
        config: asRecord(node.input),
      },
    };
  });

  const flowEdges: FlowBuilderEdge[] = engineDefinition.edges.map((edge) => ({
    source: edge.from,
    target: edge.to,
  }));
  const { orderedNodes, hasCycle } = getTopologicallyOrderedNodes(
    flowNodes,
    flowEdges,
  );
  if (hasCycle) {
    return {
      action: null,
      errors: [
        'Flow contains a cycle. Remove cyclic edges so execution order is deterministic.',
      ],
    };
  }

  const traversalNodes = getTraversalNodesFromPrimary(
    orderedNodes,
    engineDefinition.entryNodeId,
    flowEdges,
  );

  return buildLegacyActionFromTraversalNodes(
    traversalNodes,
    engineDefinition.entryNodeId,
  );
}

function isLegacyFlowBuilderV2EngineDefinition(
  value: FlowBuilderV2EngineDefinition | LegacyFlowBuilderV2EngineDefinition,
): value is LegacyFlowBuilderV2EngineDefinition {
  return 'workflow' in value;
}

function buildLegacyActionFromTraversalNodes(
  traversalNodes: readonly FlowBuilderNode[],
  primaryNodeId: string,
): FlowActionBuildResult {
  const primaryNode = traversalNodes.find((node) => node.id === primaryNodeId);
  if (!primaryNode || !isSupportedPrimaryNodeType(primaryNode.type)) {
    return {
      action: null,
      errors: ['No configured executable action node found in the flow.'],
    };
  }

  const action: Partial<DataMatrixAction> = {
    version: '1.0',
  };

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

export function adaptV2EngineDefinitionToLegacyAction(
  engineDefinition:
    | FlowBuilderV2EngineDefinition
    | LegacyFlowBuilderV2EngineDefinition,
): FlowActionBuildResult {
  if (isLegacyFlowBuilderV2EngineDefinition(engineDefinition)) {
    return adaptLegacyV2WorkflowDefinitionToLegacyAction(engineDefinition);
  }

  return adaptQrEngineDefinitionToLegacyAction(engineDefinition);
}

export function compileFlowBuilderToV2EngineDefinition(
  nodes: readonly FlowBuilderNode[],
  edges: readonly FlowBuilderEdge[] = [],
): FlowBuilderV2CompileResult {
  const errors: FlowBuilderV2Issue[] = [];
  const warnings: FlowBuilderV2Issue[] = [];

  if (nodes.length === 0) {
    errors.push(
      toIssue(
        'FLOW_EMPTY',
        'Flow is empty. Add at least one executable node.',
        ['nodes'],
      ),
    );
    return {
      engineDefinition: null,
      legacyAction: null,
      errors,
      warnings,
    };
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeIndexById = new Map(
    nodes.map((node, index) => [node.id, index] as const),
  );
  const firstIndexByNodeId = new Map<string, number>();

  for (const [index, node] of nodes.entries()) {
    const firstIndex = firstIndexByNodeId.get(node.id);
    if (typeof firstIndex === 'number') {
      errors.push(
        toIssue(
          'FLOW_DUPLICATE_NODE_ID',
          `Flow has duplicate node id "${node.id}" at indexes ${firstIndex} and ${index}.`,
          ['nodes', String(index), 'id'],
        ),
      );
      continue;
    }
    firstIndexByNodeId.set(node.id, index);
  }

  if (errors.length > 0) {
    return {
      engineDefinition: null,
      legacyAction: null,
      errors,
      warnings,
    };
  }

  const { orderedNodes, hasCycle } = getTopologicallyOrderedNodes(nodes, edges);
  if (hasCycle) {
    errors.push(
      toIssue(
        'FLOW_CYCLE',
        'Flow contains a cycle. Remove cyclic edges so execution order is deterministic.',
        ['edges'],
      ),
    );
    return {
      engineDefinition: null,
      legacyAction: null,
      errors,
      warnings,
    };
  }

  for (const [index, edge] of edges.entries()) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      warnings.push(
        toIssue(
          'FLOW_EDGE_WITH_MISSING_NODE',
          `Ignoring edge "${edge.source}" -> "${edge.target}" because one endpoint is missing.`,
          ['edges', String(index)],
        ),
      );
    }
  }

  for (const node of orderedNodes) {
    const nodeIndex = nodeIndexById.get(node.id);
    const path = ['nodes', String(nodeIndex ?? 0)];

    if (!isSupportedPrimaryNodeType(node.type)) {
      warnings.push(
        toIssue(
          'FLOW_UNSUPPORTED_NODE_TYPE',
          `Node "${node.id}" with type "${node.type}" is not executable in DataMatrix v2 compiler and was skipped.`,
          [...path, 'type'],
        ),
      );
      continue;
    }

    if (!isConfiguredNode(node.type, node.data?.config)) {
      warnings.push(
        toIssue(
          'FLOW_NODE_NOT_CONFIGURED',
          `Node "${node.id}" (${node.type}) is missing required configuration and was skipped.`,
          [...path, 'data', 'config'],
        ),
      );
    }
  }

  const primaryNode = orderedNodes.find((node) => {
    if (!isSupportedPrimaryNodeType(node.type)) {
      return false;
    }
    return isConfiguredNode(node.type, node.data?.config);
  });

  if (!primaryNode) {
    errors.push(
      toIssue(
        'FLOW_NO_EXECUTABLE_NODE',
        'No configured executable action node found in the flow.',
        ['nodes'],
      ),
    );
    return {
      engineDefinition: null,
      legacyAction: null,
      errors,
      warnings,
    };
  }

  const traversalNodes = getTraversalNodesFromPrimary(
    orderedNodes,
    primaryNode.id,
    edges,
  );

  const workflowNodes: QrEngineNode[] = [];
  for (const node of traversalNodes) {
    if (!isSupportedPrimaryNodeType(node.type)) {
      continue;
    }
    if (!isConfiguredNode(node.type, node.data?.config)) {
      continue;
    }

    const config = node.data?.config ?? {};
    const normalizedInput = omitUndefinedProperties(
      normalizeNodeConfigForV2(node.type, config),
    );
    workflowNodes.push({
      nodeId: node.id,
      kind: 'action',
      actionId: NODE_TYPE_TO_V2_ACTION_ID[node.type],
      input: normalizedInput,
      metadata: {
        flowBuilderNodeType: node.type,
      },
    });
  }

  const workflowNodeIds = new Set(workflowNodes.map((node) => node.nodeId));
  const workflowNodeOrderById = new Map(
    workflowNodes.map((node, index) => [node.nodeId, index] as const),
  );
  const dedupeEdgeKey = new Set<string>();
  const workflowEdges: QrEngineEdge[] = [];

  for (const edge of edges) {
    if (
      !workflowNodeIds.has(edge.source) ||
      !workflowNodeIds.has(edge.target) ||
      edge.source === edge.target
    ) {
      continue;
    }

    const key = `${edge.source}=>${edge.target}`;
    if (dedupeEdgeKey.has(key)) {
      continue;
    }
    dedupeEdgeKey.add(key);

    workflowEdges.push({
      from: edge.source,
      to: edge.target,
      on: 'success',
    });
  }

  workflowEdges.sort((left, right) => {
    const leftSourceIndex =
      workflowNodeOrderById.get(left.from) ?? Number.MAX_SAFE_INTEGER;
    const rightSourceIndex =
      workflowNodeOrderById.get(right.from) ?? Number.MAX_SAFE_INTEGER;
    if (leftSourceIndex !== rightSourceIndex) {
      return leftSourceIndex - rightSourceIndex;
    }

    const leftTargetIndex =
      workflowNodeOrderById.get(left.to) ?? Number.MAX_SAFE_INTEGER;
    const rightTargetIndex =
      workflowNodeOrderById.get(right.to) ?? Number.MAX_SAFE_INTEGER;
    return leftTargetIndex - rightTargetIndex;
  });

  const compiledOrderedNodeIds = workflowNodes.map((node) => node.nodeId);
  const engineDefinitionCandidate = {
    schemaVersion: QR_ENGINE_DEFINITION_SCHEMA_VERSION,
    engineId: FLOW_BUILDER_ENGINE_ID,
    engineVersion: FLOW_BUILDER_ENGINE_VERSION,
    businessId: FLOW_BUILDER_BUSINESS_ID,
    lane: 'deterministic' as const,
    entryNodeId: primaryNode.id,
    nodes: workflowNodes,
    edges: workflowEdges,
    metadata: {
      flowBuilderOrderedNodeIds: compiledOrderedNodeIds,
      flowBuilderPrimaryNodeId: primaryNode.id,
      flowBuilderCompilerVersion: '2.0',
    },
  };
  const parsedEngineDefinition = qrEngineDefinitionSchema.safeParse(
    engineDefinitionCandidate,
  );
  if (!parsedEngineDefinition.success) {
    const firstIssue = parsedEngineDefinition.error.issues[0];
    const issuePath = firstIssue?.path?.map((segment) => String(segment)) ?? [
      'engineDefinition',
    ];
    errors.push(
      toIssue(
        'FLOW_V2_ENGINE_SCHEMA_INVALID',
        firstIssue?.message ??
          'Compiled v2 engine definition failed schema validation.',
        issuePath,
      ),
    );
    return {
      engineDefinition: null,
      legacyAction: null,
      errors,
      warnings,
    };
  }
  const engineDefinition = parsedEngineDefinition.data;

  const legacyActionResult =
    adaptV2EngineDefinitionToLegacyAction(engineDefinition);

  if (!legacyActionResult.action) {
    errors.push(
      toIssue(
        'FLOW_LEGACY_ADAPTER_FAILED',
        legacyActionResult.errors[0] ??
          'Legacy adapter failed to produce a valid action.',
        ['engineDefinition'],
      ),
    );
  }

  return {
    engineDefinition,
    legacyAction: legacyActionResult.action,
    errors,
    warnings,
  };
}

export function buildDataMatrixActionFromFlowGraph(
  nodes: readonly FlowBuilderNode[],
  edges: readonly FlowBuilderEdge[] = [],
): FlowActionBuildResult {
  const result = compileFlowBuilderToV2EngineDefinition(nodes, edges);

  if (result.errors.length > 0 || !result.legacyAction) {
    const errorMessages = result.errors.map((issue) => issue.message);
    return {
      action: null,
      errors:
        errorMessages.length > 0
          ? errorMessages
          : ['Legacy adapter failed to produce a valid action.'],
    };
  }

  return {
    action: result.legacyAction,
    errors: [],
  };
}
