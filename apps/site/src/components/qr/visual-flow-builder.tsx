'use client';

import {
  Background,
  BackgroundVariant,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ArrowRight,
  Bell,
  Database,
  Download,
  Eye,
  FileText,
  Globe,
  GripVertical,
  LoaderCircle,
  Lock,
  Maximize,
  Navigation,
  Palette,
  Play,
  Printer,
  RefreshCw,
  Repeat,
  Settings,
  Share2,
  ShoppingCart,
  Square,
  Unlock,
  Upload,
  User,
  Wifi,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatedSvgEdge } from '@/components/animated-svg-edge';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from '@/components/base-node';
import { CustomEdge } from '@/components/custom-edge';
import {
  DeleteNodeButton,
  flowNodeTypes,
} from '@/components/custom-flow-nodes';
import { DataEdge } from '@/components/data-edge';
import { FlowProvider, useFlow } from '@/components/flow-context';
import { NodeButtonHandle } from '@/components/node-button-handle';
import { NodeStats } from '@/components/node-stats';
import {
  type NodeStatus,
  NodeStatusIndicator,
} from '@/components/node-status-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { CustomSelect } from '@/components/ui/custom-select';
import { DataMatrixCode } from '@/components/ui/datamatrix-code';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from '@/components/ui/sortable';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ZoomSlider } from '@/components/zoom-slider';
import { useWifiNetworks } from '@/hooks/use-wifi';
import { getLayoutedElements } from '@/lib/auto-layout-utils';
import {
  type DataMatrixAction,
  dataMatrixActionSchema,
} from '@/lib/datamatrix';
import { ActionExecutor } from '@/lib/datamatrix/action-executor';
import {
  buildDataMatrixActionFromFlowGraph,
  type FlowBuilderEdge,
  type FlowBuilderNode,
} from '@/lib/datamatrix/flow-action-builder';
import { ScrollArea } from '../ui/scroll-area';

// Define custom node types
export type NodeType =
  | 'wifiConnect'
  | 'profileEnrichment'
  | 'equipmentSession'
  | 'restaurantOrdering'
  | 'productInteraction'
  | 'navigate'
  | 'notification'
  | 'condition'
  | 'loop'
  | 'apiCall'
  | 'custom'
  | 'runner'
  // Custom flow node types with special shapes
  | 'input'
  | 'output'
  | 'process'
  | 'predefined'
  | 'document';

type BaseNodeData = {
  label: string;
  description?: string;
  status?: NodeStatus;
  config?: Record<string, unknown>;
  stats?: {
    started?: number;
    running?: number;
    completed?: number;
    error?: number;
    progress?: number; // Add progress property
  };
};

// Helper function to get fixed label and description for each node type
export const getNodeLabelAndDescription = (type: NodeType) => {
  switch (type) {
    case 'wifiConnect':
      return {
        label: 'WiFi Connection',
        description: 'Connect to a WiFi network',
      };
    case 'profileEnrichment':
      return {
        label: 'Profile Enrichment',
        description: 'Collect user profile information',
      };
    case 'equipmentSession':
      return {
        label: 'Equipment Session',
        description: 'Manage equipment access session',
      };
    case 'restaurantOrdering':
      return {
        label: 'Restaurant Ordering',
        description: 'Place restaurant orders',
      };
    case 'productInteraction':
      return {
        label: 'Product Interaction',
        description: 'Interact with products',
      };
    case 'navigate':
      return { label: 'Navigation', description: 'Navigate to a URL' };
    case 'notification':
      return { label: 'Notification', description: 'Send a notification' };
    case 'condition':
      return { label: 'Condition', description: 'Conditional branching' };
    case 'loop':
      return { label: 'Loop', description: 'Repeat a set of actions' };
    case 'apiCall':
      return { label: 'API Call', description: 'Make an API request' };
    case 'runner':
      return {
        label: 'Workflow Runner',
        description: 'Execute and monitor workflow',
      };
    // Custom flow node types
    case 'input':
      return { label: 'Input', description: 'Input data or parameters' };
    case 'output':
      return { label: 'Output', description: 'Output results or data' };
    case 'process':
      return { label: 'Process', description: 'Process or transformation' };
    case 'predefined':
      return {
        label: 'Predefined Process',
        description: 'Predefined or named process',
      };
    case 'document':
      return {
        label: 'Document',
        description: 'Document or report generation',
      };
    default:
      return { label: type, description: `Configure this ${type} node` };
  }
};

export interface CustomNode extends Node<BaseNodeData> {
  type: NodeType;
}

type WifiConnectNodeData = {
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
  status: NodeStatus;
  label: string;
  description: string;
  config: {
    ssid: string;
    password: string;
    security: string;
  };
};

const WifiConnectNode = ({
  data,
  id,
}: NodeProps<Node<WifiConnectNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  // Calculate progress based on stats
  const progress =
    data.stats?.progress ??
    (data.stats?.completed && data.stats?.started
      ? (data.stats.completed / data.stats.started) * 100
      : 0);

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 dark:border-blue-600/30 text-blue-900 dark:text-blue-100 shadow-sm">
        <BaseNodeHeader className="text-blue-900 dark:text-blue-100">
          <BaseNodeHeaderTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-blue-900 dark:text-blue-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>SSID:</span>
              <span className="font-mono">
                {data.config?.ssid || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Security:</span>
              <span>{data.config?.security || 'WPA2'}</span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === 'loading' && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="wifi-input"
          nodeId={id}
          handleId="wifi-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="wifi-output"
          nodeId={id}
          handleId="wifi-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type ProfileEnrichmentNodeData = {
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
  status: NodeStatus;
  label: string;
  description: string;
  config: {
    field: string;
    required: boolean;
  };
};

const ProfileEnrichmentNode = ({
  data,
  id,
}: NodeProps<Node<ProfileEnrichmentNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-purple-500/20 dark:bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 dark:border-purple-600/30 text-purple-900 dark:text-purple-100 shadow-sm">
        <BaseNodeHeader className="text-purple-900 dark:text-purple-100">
          <BaseNodeHeaderTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <User className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-purple-900 dark:text-purple-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Field:</span>
              <span className="font-mono">
                {data.config?.field || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Required:</span>
              <span>{data.config?.required ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="profile-input"
          nodeId={id}
          handleId="profile-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-purple-500 dark:bg-purple-600 border-purple-600 dark:border-purple-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="profile-output"
          nodeId={id}
          handleId="profile-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-purple-500 dark:bg-purple-600 border-purple-600 dark:border-purple-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type EquipmentSessionNodeData = {
  label: string;
  status: NodeStatus;
  equipment: string;
  description: string;
  config: {
    equipmentId: string;
    duration: number;
  };
};

const EquipmentSessionNode = ({
  data,
  id,
}: NodeProps<Node<EquipmentSessionNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-orange-500/20 dark:bg-orange-600/20 backdrop-blur-sm border border-orange-500/30 dark:border-orange-600/30 text-orange-900 dark:text-orange-100 shadow-sm">
        <BaseNodeHeader className="text-orange-900 dark:text-orange-100">
          <BaseNodeHeaderTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-orange-900 dark:text-orange-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Equipment:</span>
              <span className="font-mono">
                {data.config?.equipmentId || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{data.config?.duration || '30'} min</span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="equipment-input"
          nodeId={id}
          handleId="equipment-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-orange-500 dark:bg-orange-600 border-orange-600 dark:border-orange-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="equipment-output"
          nodeId={id}
          handleId="equipment-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-orange-500 dark:bg-orange-600 border-orange-600 dark:border-orange-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type RestaurantOrderingNodeData = {
  label: string;
  status: NodeStatus;
  restaurant: string;
  description: string;
  config: {
    restaurantId: string;
    table: string;
  };
};

const RestaurantOrderingNode = ({
  data,
  id,
}: NodeProps<Node<RestaurantOrderingNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-amber-500/20 dark:bg-amber-600/20 backdrop-blur-sm border border-amber-500/30 dark:border-amber-600/30 text-amber-900 dark:text-amber-100 shadow-sm">
        <BaseNodeHeader className="text-amber-900 dark:text-amber-100">
          <BaseNodeHeaderTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-amber-900 dark:text-amber-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Restaurant:</span>
              <span className="font-mono">
                {data.config?.restaurantId || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Table:</span>
              <span>{data.config?.table || 'Not set'}</span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="restaurant-input"
          nodeId={id}
          handleId="restaurant-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="restaurant-output"
          nodeId={id}
          handleId="restaurant-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type ProductInteractionNodeData = {
  label: string;
  status: NodeStatus;
  product: string;
  description: string;
  config: {
    productId: string;
    sku: string;
  };
};

const ProductInteractionNode = ({
  data,
  id,
}: NodeProps<Node<ProductInteractionNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-teal-500/20 dark:bg-teal-600/20 backdrop-blur-sm border border-teal-500/30 dark:border-teal-600/30 text-teal-900 dark:text-teal-100 shadow-sm">
        <BaseNodeHeader className="text-teal-900 dark:text-teal-100">
          <BaseNodeHeaderTitle className="text-teal-900 dark:text-teal-100 flex items-center gap-2">
            <Database className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-teal-900 dark:text-teal-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Product:</span>
              <span className="font-mono">
                {data.config?.productId || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SKU:</span>
              <span>{data.config?.sku || 'Not set'}</span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="product-input"
          nodeId={id}
          handleId="product-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="product-output"
          nodeId={id}
          handleId="product-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type NavigateNodeData = {
  label: string;
  status: NodeStatus;
  url: string;
  description: string;
  config: {
    url: string;
  };
};

const NavigateNode = ({ data, id }: NodeProps<Node<NavigateNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-cyan-500/20 dark:bg-cyan-600/20 backdrop-blur-sm border border-cyan-500/30 dark:border-cyan-600/30 text-cyan-900 dark:text-cyan-100 shadow-sm">
        <BaseNodeHeader className="text-cyan-900 dark:text-cyan-100">
          <BaseNodeHeaderTitle className="text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-cyan-900 dark:text-cyan-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>URL:</span>
              <span className="font-mono truncate max-w-[100px]">
                {data.config?.url || 'Not set'}
              </span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="navigate-input"
          nodeId={id}
          handleId="navigate-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-cyan-500 dark:bg-cyan-600 border-cyan-600 dark:border-cyan-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="navigate-output"
          nodeId={id}
          handleId="navigate-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-cyan-500 dark:bg-cyan-600 border-cyan-600 dark:border-cyan-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type NotificationNodeData = {
  label: string;
  status: NodeStatus;
  title: string;
  description: string;
  config: {
    title: string;
  };
};

const NotificationNode = ({
  data,
  id,
}: NodeProps<Node<NotificationNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-pink-500/20 dark:bg-pink-600/20 backdrop-blur-sm border border-pink-500/30 dark:border-pink-600/30 text-pink-900 dark:text-pink-100 shadow-sm">
        <BaseNodeHeader className="text-pink-900 dark:text-pink-100">
          <BaseNodeHeaderTitle className="text-pink-900 dark:text-pink-100 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-pink-900 dark:text-pink-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Title:</span>
              <span className="font-mono truncate max-w-[100px]">
                {data.config?.title || 'Not set'}
              </span>
            </div>
          </div>
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="notification-input"
          nodeId={id}
          handleId="notification-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-pink-500 dark:bg-pink-600 border-pink-600 dark:border-pink-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="notification-output"
          nodeId={id}
          handleId="notification-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-pink-500 dark:bg-pink-600 border-pink-600 dark:border-pink-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type ApiCallNodeData = {
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
  status: NodeStatus;
  label: string;
  description: string;
  config: {
    method: string;
    url: string;
  };
};

const APICallNode = ({ data, id }: NodeProps<Node<ApiCallNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();
  // Calculate progress based on stats
  const progress =
    data.stats?.progress ??
    (data.stats?.completed && data.stats?.started
      ? (data.stats.completed / data.stats.started) * 100
      : 0);

  // Get method-specific color
  const method = data.config?.method || 'GET';
  const methodColors = {
    GET: 'bg-emerald-500',
    POST: 'bg-blue-500',
    PUT: 'bg-amber-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-purple-500',
  };
  const methodColor =
    methodColors[method as keyof typeof methodColors] || 'bg-emerald-500';

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-emerald-500/20 dark:bg-emerald-600/20 backdrop-blur-sm border border-emerald-500/30 dark:border-emerald-600/30 text-emerald-900 dark:text-emerald-100 shadow-sm">
        <BaseNodeHeader className="text-emerald-900 dark:text-emerald-100">
          <BaseNodeHeaderTitle className="text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <svg
              role="img"
              aria-label="DataMatrix Scanner"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m7 11 2-2-2-2" />
              <path d="M11 13h4" />
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            </svg>
            {data.label}
            <Badge className={`ml-auto h-5 ${methodColor}`}>{method}</Badge>
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-emerald-900 dark:text-emerald-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Method:</span>
              <span>{method}</span>
            </div>
            <div className="flex justify-between">
              <span>URL:</span>
              <span className="font-mono truncate max-w-[100px]">
                {data.config?.url || 'Not set'}
              </span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === 'loading' && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="api-input"
          nodeId={id}
          handleId="api-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="api-output"
          nodeId={id}
          handleId="api-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type RunnerNodeData = {
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
  status: NodeStatus;
  label: string;
  description: string;
  config: {
    mode: string;
    timeout: number;
    retries: number;
    continueOnError: boolean;
  };
};

const RunnerNode = ({ data, id }: NodeProps<Node<RunnerNodeData>>) => {
  const { onAddNodeAtHandle } = useFlow();
  // Calculate progress based on stats
  const progress =
    data.stats?.progress ??
    (data.stats?.completed && data.stats?.started
      ? (data.stats.completed / data.stats.started) * 100
      : 0);

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-violet-500/20 dark:bg-violet-600/20 backdrop-blur-sm border border-violet-500/30 dark:border-violet-600/30 text-violet-900 dark:text-violet-100 shadow-sm">
        <BaseNodeHeader className="text-violet-900 dark:text-violet-100">
          <BaseNodeHeaderTitle className="text-violet-900 dark:text-violet-100 flex items-center gap-2">
            <svg
              role="img"
              aria-label="Workflow Runner"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M12 2v20" />
              <path d="m8 18 4-4 4 4" />
              <path d="m8 6 4 4 4-4" />
            </svg>
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-violet-900 dark:text-violet-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="capitalize">{data.status || 'idle'}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span>{data.config?.mode || 'sequential'}</span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === 'loading' && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="target"
          position={Position.Top}
          id="runner-input"
          nodeId={id}
          handleId="runner-input"
          handleType="target"
          onAddNode={onAddNodeAtHandle}
          className="bg-violet-500 dark:bg-violet-600 border-violet-600 dark:border-violet-700"
        />
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <NodeButtonHandle
          type="source"
          position={Position.Bottom}
          id="runner-output"
          nodeId={id}
          handleId="runner-output"
          handleType="source"
          onAddNode={onAddNodeAtHandle}
          className="bg-violet-500 dark:bg-violet-600 border-violet-600 dark:border-violet-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

// Node type configuration
const nodeTypes: NodeTypes = {
  wifiConnect: WifiConnectNode,
  profileEnrichment: ProfileEnrichmentNode,
  equipmentSession: EquipmentSessionNode,
  restaurantOrdering: RestaurantOrderingNode,
  productInteraction: ProductInteractionNode,
  navigate: NavigateNode,
  notification: NotificationNode,
  apiCall: APICallNode,
  runner: RunnerNode, // Add runner node type
  // Custom flow nodes with special shapes
  ...flowNodeTypes,
};

// Edge type configuration
const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  data: DataEdge,
  animated: AnimatedSvgEdge,
};

// Draggable node component for the sidebar
const DraggableNode = ({
  nodeType,
  onAddNode,
}: {
  nodeType: {
    type: string;
    label: string;
    color: string;
    order?: number;
  };
  onAddNode: (type: NodeType) => void;
}) => {
  // Map node types to icons
  const iconMap = {
    wifiConnect: Wifi,
    profileEnrichment: User,
    equipmentSession: Settings,
    restaurantOrdering: ShoppingCart,
    productInteraction: Database,
    navigate: Navigation,
    notification: Bell,
    condition: GripVertical,
    loop: Repeat,
    apiCall: Globe,
    runner: Play,
    input: ArrowRight,
    output: ArrowRight,
    process: Square,
    predefined: Square,
    document: FileText,
  };

  const Icon = iconMap[nodeType.type as keyof typeof iconMap] || Database;

  // Native drag start handler for HTML5 drag and drop
  const onNativeDragStart = (event: React.DragEvent) => {
    // Stop propagation to prevent conflicts with sortable
    event.stopPropagation();
    event.dataTransfer.setData('application/reactflow', nodeType.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start cursor-grab active:cursor-grabbing gap-2"
            onClick={() => onAddNode(nodeType.type as NodeType)}
            draggable
            onDragStart={onNativeDragStart}
          >
            <div className={`w-3 h-3 rounded-full ${nodeType.color}`} />
            <Icon className="h-4 w-4" />
            <p className="text-left overflow-ellipsis line-clamp-1">
              {nodeType.label}
            </p>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{nodeType.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Sidebar component for node library with drag and drop
const NodeLibrary = ({
  onAddNode,
}: {
  onAddNode: (type: NodeType) => void;
}) => {
  const { nodeLibraryOrder, setNodeLibraryOrder, resetNodeLibraryOrder } =
    useFlow();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter node types based on search term
  const filteredNodeTypes = useMemo(() => {
    if (!searchTerm) return nodeLibraryOrder;
    return nodeLibraryOrder.filter(
      (nodeType) =>
        nodeType.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nodeType.type.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [nodeLibraryOrder, searchTerm]);

  // Handle reordering
  const handleReorder = (newOrder: typeof nodeLibraryOrder) => {
    setNodeLibraryOrder(newOrder);
  };

  return (
    <Card className="w-64 h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Node Library
        </CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetNodeLibraryOrder}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset Order</p>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="pb-2">
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <ScrollArea className="pb-32">
          <Sortable
            value={filteredNodeTypes}
            onValueChange={handleReorder}
            getItemValue={(item) => item.type}
          >
            <SortableContent asChild>
              <div className="space-y-2">
                {filteredNodeTypes.map((nodeType) => (
                  <SortableItem
                    key={nodeType.type}
                    value={nodeType.type}
                    asChild
                  >
                    <div className="flex items-center gap-2">
                      <SortableItemHandle asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0 cursor-grab"
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </SortableItemHandle>
                      <div className="flex-1">
                        <DraggableNode
                          nodeType={nodeType}
                          onAddNode={onAddNode}
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContent>
            <SortableOverlay>
              {(_props) => (
                <div className="flex items-center gap-2 opacity-50">
                  <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <div className="bg-muted border rounded-md px-4 py-2 flex items-center">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground mr-2" />
                    <div className="h-4 w-4 mr-2 bg-muted-foreground rounded" />
                    <div className="h-4 bg-muted-foreground rounded w-20" />
                  </div>
                </div>
              )}
            </SortableOverlay>
          </Sortable>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Node Setup Panel - Shows setup form when node is not configured
const NodeSetupPanel = ({
  selectedNode,
  onUpdateNode,
}: {
  selectedNode: CustomNode;
  onUpdateNode: (id: string, data: BaseNodeData) => void;
}) => {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const handleConfigChange = (key: string, value: any) => {
    const updatedConfig = {
      ...selectedNode.data.config,
      [key]: value,
    };

    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      config: updatedConfig,
    });
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Setup {selectedNode.data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <p className="text-sm text-muted-foreground">
              {selectedNode.data.description}
            </p>
          </div>

          {/* Show node-specific setup form based on type */}
          <NodeSetupForm
            selectedNode={selectedNode}
            handleConfigChange={handleConfigChange}
          />

          <div className="pt-4">
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => {
                // Mark node as configured
                // This would typically involve some state management
              }}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to render node-specific setup form
const NodeSetupForm = ({
  selectedNode,
  handleConfigChange,
}: {
  selectedNode: CustomNode;
  handleConfigChange: (key: string, value: unknown) => void;
}) => {
  switch (selectedNode.type) {
    case 'wifiConnect': {
      // Use our WiFi hook for real network scanning
      const {
        wifiScanResult,
        isScanning,
        scanNetworks,
        wifiScanError,
        isScanError,
        // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
      } = useWifiNetworks();

      // Get available networks from scan result or use mock data as fallback
      const availableNetworks = wifiScanResult?.success
        ? wifiScanResult.networks.map((network) => network.ssid)
        : ['HomeNetwork', 'OfficeWiFi', 'CoffeeShop-Guest', 'NeighborNetwork'];

      // Handle network selection from dropdown or direct input
      const handleNetworkChange = (value: string) => {
        handleConfigChange('ssid', value);

        // If it's a known network, also set the security type
        const network = wifiScanResult?.success
          ? wifiScanResult.networks.find((entry) => entry.ssid === value)
          : [
              { ssid: 'HomeNetwork', security: 'WPA2' },
              { ssid: 'OfficeWiFi', security: 'WPA3' },
              { ssid: 'CoffeeShop-Guest', security: 'open' },
              { ssid: 'NeighborNetwork', security: 'WPA2' },
            ].find((net) => net.ssid === value);

        if (network) {
          // handleConfigChange("security", network.security);
        }
      };

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>WiFi Network</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => scanNetworks()}
                disabled={isScanning}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`}
                />
                {isScanning ? 'Scanning...' : 'Scan'}
              </Button>
            </div>

            {isScanError && (
              <div className="text-sm text-red-500">
                Error scanning networks:{' '}
                {wifiScanError?.message || 'Unknown error'}
              </div>
            )}

            <div className="space-y-2">
              <Label>Network Name (SSID)</Label>
              <CustomSelect
                value={(selectedNode.data.config?.ssid as string) || ''}
                onValueChange={handleNetworkChange}
                placeholder="Select or type network name..."
                options={availableNetworks}
                allowCustom={true}
              />
              <p className="text-xs text-muted-foreground">
                Select a network from the list or type a custom network name
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="password"
              type="password"
              value={(selectedNode.data.config?.password as string) || ''}
              onChange={(e) => handleConfigChange('password', e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="security">Security Type</Label>
            <Select
              value={(selectedNode.data.config?.security as string) || 'WPA2'}
              onValueChange={(value) => handleConfigChange('security', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="security">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WPA3">WPA3</SelectItem>
                <SelectItem value="WPA2">WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="open">Open Network</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    case 'navigate':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="url"
              value={(selectedNode.data.config?.url as string) || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="params">URL Parameters</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="params"
              value={
                (selectedNode.data.config?.paramsRaw as string) ||
                JSON.stringify(selectedNode.data.config?.params || {}, null, 2)
              }
              onChange={(e) => handleConfigChange('paramsRaw', e.target.value)}
              onBlur={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  handleConfigChange('params', params);
                  handleConfigChange('paramsRaw', undefined);
                  toast.success('Parameters updated successfully');
                } catch (_error) {
                  toast.error('Invalid JSON in parameters');
                }
              }}
              placeholder='{"param1": "value1", "param2": "value2"}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter parameters as JSON key-value pairs. Press Tab or click
              outside to save.
            </p>
          </div>
        </div>
      );

    case 'notification':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="title"
              value={(selectedNode.data.config?.title as string) || ''}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              placeholder="Notification title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="message"
              value={(selectedNode.data.config?.message as string) || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="Notification message"
              rows={3}
            />
          </div>
        </div>
      );

    case 'profileEnrichment':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field Checks</Label>
            <div className="text-xs text-muted-foreground">
              Configure checks for user profile fields
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="field">Field Name</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="field"
              value={(selectedNode.data.config?.field as string) || ''}
              onChange={(e) => handleConfigChange('field', e.target.value)}
              placeholder="e.g., emergency_contact"
            />
          </div>
          <div className="flex items-center space-x-2">
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Switch
              id="required"
              checked={selectedNode.data.config?.required === true}
              onCheckedChange={(checked) =>
                handleConfigChange('required', checked)
              }
            />
            <Label htmlFor="required">Field Required</Label>
          </div>
        </div>
      );

    case 'equipmentSession':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Equipment Information</Label>
            <div className="text-xs text-muted-foreground">
              Configure equipment access and session management
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipmentId">Equipment ID</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="equipmentId"
              value={(selectedNode.data.config?.equipmentId as string) || ''}
              onChange={(e) =>
                handleConfigChange('equipmentId', e.target.value)
              }
              placeholder="e.g., treadmill_001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipmentType">Equipment Type</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="equipmentType"
              value={(selectedNode.data.config?.equipmentType as string) || ''}
              onChange={(e) =>
                handleConfigChange('equipmentType', e.target.value)
              }
              placeholder="e.g., cardio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Session Duration (minutes)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="duration"
              type="number"
              value={(selectedNode.data.config?.duration as number) || ''}
              onChange={(e) =>
                handleConfigChange(
                  'duration',
                  Number.parseInt(e.target.value, 10) || 0,
                )
              }
              placeholder="30"
            />
          </div>
        </div>
      );

    case 'restaurantOrdering':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Restaurant Information</Label>
            <div className="text-xs text-muted-foreground">
              Configure restaurant ordering experience
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="restaurantId">Restaurant ID</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="restaurantId"
              value={(selectedNode.data.config?.restaurantId as string) || ''}
              onChange={(e) =>
                handleConfigChange('restaurantId', e.target.value)
              }
              placeholder="e.g., anjal_restaurant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table">Table Identifier</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="table"
              value={(selectedNode.data.config?.table as string) || ''}
              onChange={(e) => handleConfigChange('table', e.target.value)}
              placeholder="e.g., table_5 or from_context"
            />
          </div>
        </div>
      );

    case 'productInteraction':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product Information</Label>
            <div className="text-xs text-muted-foreground">
              Configure product interaction experience
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="productId">Product ID</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="productId"
              value={(selectedNode.data.config?.productId as string) || ''}
              onChange={(e) => handleConfigChange('productId', e.target.value)}
              placeholder="e.g., smart_watch_x1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">Product SKU</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="sku"
              value={(selectedNode.data.config?.sku as string) || ''}
              onChange={(e) => handleConfigChange('sku', e.target.value)}
              placeholder="e.g., SW-X1-BLK-001"
            />
          </div>
        </div>
      );

    case 'condition':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Condition Logic</Label>
            <div className="text-xs text-muted-foreground">
              Configure conditional execution logic
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Condition Expression</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="condition"
              value={(selectedNode.data.config?.condition as string) || ''}
              onChange={(e) => handleConfigChange('condition', e.target.value)}
              placeholder="e.g., user.age > 18"
            />
            <p className="text-xs text-muted-foreground">
              Use JavaScript expressions. Available variables: user, context,
              data
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truePath">True Path Label</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="truePath"
              value={(selectedNode.data.config?.truePath as string) || 'True'}
              onChange={(e) => handleConfigChange('truePath', e.target.value)}
              placeholder="e.g., Adult Content"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="falsePath">False Path Label</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="falsePath"
              value={(selectedNode.data.config?.falsePath as string) || 'False'}
              onChange={(e) => handleConfigChange('falsePath', e.target.value)}
              placeholder="e.g., Restricted Content"
            />
          </div>
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2">Available Operators</h4>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <Badge variant="secondary">==</Badge>
              <Badge variant="secondary">!=</Badge>
              <Badge variant="secondary">{'>'}</Badge>
              <Badge variant="secondary">{'<'}</Badge>
              <Badge variant="secondary">{'>='}</Badge>
              <Badge variant="secondary">{'<='}</Badge>
              <Badge variant="secondary">&amp;&amp;</Badge>
              <Badge variant="secondary">||</Badge>
              <Badge variant="secondary">!</Badge>
            </div>
          </div>
        </div>
      );

    case 'loop':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Loop Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Configure loop iterations
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="iterations">Number of Iterations</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="iterations"
              type="number"
              value={(selectedNode.data.config?.iterations as number) || ''}
              onChange={(e) =>
                handleConfigChange(
                  'iterations',
                  Number.parseInt(e.target.value, 10) || 0,
                )
              }
              placeholder="e.g., 5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loopVariable">Loop Variable Name</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="loopVariable"
              value={
                (selectedNode.data.config?.loopVariable as string) || 'item'
              }
              onChange={(e) =>
                handleConfigChange('loopVariable', e.target.value)
              }
              placeholder="e.g., item, user, product"
            />
          </div>
        </div>
      );

    case 'apiCall':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>API Call Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Configure API endpoint and parameters
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">HTTP Method</Label>
            <Select
              value={(selectedNode.data.config?.method as string) || 'GET'}
              onValueChange={(value) => handleConfigChange('method', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">API Endpoint URL</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="url"
              value={(selectedNode.data.config?.url as string) || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headers">Headers (JSON)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="headers"
              value={
                (selectedNode.data.config?.headersRaw as string) ||
                JSON.stringify(selectedNode.data.config?.headers || {}, null, 2)
              }
              onChange={(e) => handleConfigChange('headersRaw', e.target.value)}
              onBlur={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  handleConfigChange('headers', headers);
                  handleConfigChange('headersRaw', undefined);
                  toast.success('Headers updated successfully');
                } catch (_error) {
                  toast.error('Invalid JSON in headers');
                }
              }}
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Request Body (JSON)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="body"
              value={
                (selectedNode.data.config?.bodyRaw as string) ||
                JSON.stringify(selectedNode.data.config?.body || {}, null, 2)
              }
              onChange={(e) => handleConfigChange('bodyRaw', e.target.value)}
              onBlur={(e) => {
                try {
                  const body = JSON.parse(e.target.value);
                  handleConfigChange('body', body);
                  handleConfigChange('bodyRaw', undefined);
                  toast.success('Body updated successfully');
                } catch (_error) {
                  toast.error('Invalid JSON in body');
                }
              }}
              placeholder='{"key": "value"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    case 'runner':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Runner Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Configure workflow execution settings
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mode">Execution Mode</Label>
            <Select
              value={(selectedNode.data.config?.mode as string) || 'sequential'}
              onValueChange={(value) => handleConfigChange('mode', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential</SelectItem>
                <SelectItem value="parallel">Parallel</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="timeout"
              type="number"
              value={(selectedNode.data.config?.timeout as number) || 30}
              onChange={(e) =>
                handleConfigChange(
                  'timeout',
                  Number.parseInt(e.target.value, 10) || 30,
                )
              }
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retries">Max Retries</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="retries"
              type="number"
              value={(selectedNode.data.config?.retries as number) || 3}
              onChange={(e) =>
                handleConfigChange(
                  'retries',
                  Number.parseInt(e.target.value, 10) || 3,
                )
              }
              placeholder="3"
            />
          </div>
          <div className="flex items-center space-x-2">
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Switch
              id="continueOnError"
              checked={selectedNode.data.config?.continueOnError === true}
              onCheckedChange={(checked) =>
                handleConfigChange('continueOnError', checked)
              }
            />
            <Label htmlFor="continueOnError">Continue on Error</Label>
          </div>
        </div>
      );

    case 'input':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Input Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Define the input source and fallback defaults for this workflow.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inputKey">Input Key</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="inputKey"
              value={(selectedNode.data.config?.inputKey as string) || ''}
              onChange={(e) => handleConfigChange('inputKey', e.target.value)}
              placeholder="e.g., qr_payload"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inputSource">Input Source</Label>
            <Select
              value={(selectedNode.data.config?.source as string) || 'scan'}
              onValueChange={(value) => handleConfigChange('source', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="inputSource">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scan">Scan Payload</SelectItem>
                <SelectItem value="context">Session Context</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inputDefaultValue">Default Value</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="inputDefaultValue"
              value={(selectedNode.data.config?.defaultValue as string) || ''}
              onChange={(e) =>
                handleConfigChange('defaultValue', e.target.value)
              }
              placeholder="Optional fallback value"
            />
          </div>
        </div>
      );

    case 'output':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Output Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Choose where execution results should be sent.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outputTarget">Output Target</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="outputTarget"
              value={(selectedNode.data.config?.target as string) || ''}
              onChange={(e) => handleConfigChange('target', e.target.value)}
              placeholder="e.g., admin_dashboard"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outputFormat">Output Format</Label>
            <Select
              value={(selectedNode.data.config?.format as string) || 'json'}
              onValueChange={(value) => handleConfigChange('format', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="outputFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'process':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Process Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Describe the transformation this step should perform.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="processOperation">Operation Name</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="processOperation"
              value={(selectedNode.data.config?.operation as string) || ''}
              onChange={(e) => handleConfigChange('operation', e.target.value)}
              placeholder="e.g., enrich_payload"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="processInstructions">Instructions</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="processInstructions"
              value={(selectedNode.data.config?.instructions as string) || ''}
              onChange={(e) =>
                handleConfigChange('instructions', e.target.value)
              }
              placeholder="Explain how this step transforms incoming data."
              rows={3}
            />
          </div>
        </div>
      );

    case 'predefined':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Predefined Process Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Select a reusable workflow block and pass parameters.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="templateName"
              value={(selectedNode.data.config?.template as string) || ''}
              onChange={(e) => handleConfigChange('template', e.target.value)}
              placeholder="e.g., welcome_sequence_v1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="templateParams">Template Params (JSON)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="templateParams"
              value={
                (selectedNode.data.config?.paramsRaw as string) ||
                JSON.stringify(selectedNode.data.config?.params || {}, null, 2)
              }
              onChange={(e) => handleConfigChange('paramsRaw', e.target.value)}
              onBlur={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  handleConfigChange('params', params);
                  handleConfigChange('paramsRaw', undefined);
                  toast.success('Template params updated successfully');
                } catch (_error) {
                  toast.error('Invalid JSON in template params');
                }
              }}
              placeholder='{"language":"en","segment":"new"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    case 'document':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Configure generated documents and their delivery channel.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentTitle">Document Title</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="documentTitle"
              value={(selectedNode.data.config?.title as string) || ''}
              onChange={(e) => handleConfigChange('title', e.target.value)}
              placeholder="e.g., Session Summary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentFormat">Format</Label>
            <Select
              value={(selectedNode.data.config?.format as string) || 'pdf'}
              onValueChange={(value) => handleConfigChange('format', value)}
            >
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <SelectTrigger id="documentFormat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentChannel">Delivery Channel</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="documentChannel"
              value={(selectedNode.data.config?.channel as string) || ''}
              onChange={(e) => handleConfigChange('channel', e.target.value)}
              placeholder="e.g., customer_email"
            />
          </div>
        </div>
      );

    case 'custom':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Custom Node Configuration</Label>
            <div className="text-xs text-muted-foreground">
              Store custom metadata for advanced execution adapters.
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customNodeType">Custom Type</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Input
              id="customNodeType"
              value={(selectedNode.data.config?.customType as string) || ''}
              onChange={(e) => handleConfigChange('customType', e.target.value)}
              placeholder="e.g., webhook_transformer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customPayload">Custom Payload (JSON)</Label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <Textarea
              id="customPayload"
              value={
                (selectedNode.data.config?.payloadRaw as string) ||
                JSON.stringify(selectedNode.data.config?.payload || {}, null, 2)
              }
              onChange={(e) => handleConfigChange('payloadRaw', e.target.value)}
              onBlur={(e) => {
                try {
                  const payload = JSON.parse(e.target.value);
                  handleConfigChange('payload', payload);
                  handleConfigChange('payloadRaw', undefined);
                  toast.success('Custom payload updated successfully');
                } catch (_error) {
                  toast.error('Invalid JSON in custom payload');
                }
              }}
              placeholder='{"key":"value"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground py-4 text-center">
          <p className="font-medium">Configuration not yet implemented</p>
          <p className="text-sm mt-1">
            Configuration options for this node type are not yet available.
          </p>
        </div>
      );
  }
};

export type RunnerStatusNode = {
  id: string;
  type: NodeType;
  data: {
    status?: NodeStatus;
    [key: string]: unknown;
  };
};

type RunnerSetNodes = (
  updater: (nodes: RunnerStatusNode[]) => RunnerStatusNode[],
) => void;

export const ACTION_TO_NODE_TYPE: Record<DataMatrixAction['action'], NodeType> =
  {
    wifi_connect: 'wifiConnect',
    profile_enrichment: 'profileEnrichment',
    equipment_session: 'equipmentSession',
    restaurant_ordering: 'restaurantOrdering',
    product_interaction: 'productInteraction',
    navigate: 'navigate',
    form_request: 'profileEnrichment',
    choice_selection: 'profileEnrichment',
    notification: 'notification',
    equipment_control: 'equipmentSession',
  };

export const getInvolvedNodeTypes = (
  action: DataMatrixAction,
): Set<NodeType> => {
  const involvedTypes = new Set<NodeType>();
  involvedTypes.add(ACTION_TO_NODE_TYPE[action.action]);

  if (action.wifi) involvedTypes.add('wifiConnect');
  if (action.navigation) involvedTypes.add('navigate');
  if (action.post_connect?.notification) involvedTypes.add('notification');
  if (action.checks?.length) involvedTypes.add('profileEnrichment');
  if (action.equipment || action.session || action.actions) {
    involvedTypes.add('equipmentSession');
  }
  if (action.restaurant) involvedTypes.add('restaurantOrdering');
  if (action.product) involvedTypes.add('productInteraction');

  return involvedTypes;
};

type ExecuteWorkflowWithStatusTransitionsArgs = {
  action: DataMatrixAction;
  nodes: readonly RunnerStatusNode[];
  setNodes: RunnerSetNodes;
  executeAction: (action: DataMatrixAction) => Promise<void>;
};

export async function executeWorkflowWithStatusTransitions({
  action,
  nodes,
  setNodes,
  executeAction,
}: ExecuteWorkflowWithStatusTransitionsArgs): Promise<void> {
  const involvedNodeTypes = getInvolvedNodeTypes(action);
  const runnerNodeId = nodes.find((node) => node.type === 'runner')?.id;

  const applyStatus = (status: NodeStatus) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id === runnerNodeId || involvedNodeTypes.has(node.type)) {
          return {
            ...node,
            data: {
              ...node.data,
              status,
            },
          };
        }

        return node;
      }),
    );
  };

  applyStatus('loading');

  try {
    await executeAction(action);
    applyStatus('success');
  } catch (error) {
    applyStatus('error');
    throw error;
  }
}

type ImportedFlowNode = {
  type: NodeType;
  config: Record<string, unknown>;
};

const FLOW_IMPORT_X_GAP = 280;
const FLOW_IMPORT_START_X = 140;
const FLOW_IMPORT_START_Y = 180;

function getPrimaryNodeTypeForAction(
  actionType: DataMatrixAction['action'],
): NodeType {
  switch (actionType) {
    case 'wifi_connect':
      return 'wifiConnect';
    case 'profile_enrichment':
    case 'form_request':
    case 'choice_selection':
      return 'profileEnrichment';
    case 'equipment_session':
    case 'equipment_control':
      return 'equipmentSession';
    case 'restaurant_ordering':
      return 'restaurantOrdering';
    case 'product_interaction':
      return 'productInteraction';
    case 'navigate':
      return 'navigate';
    case 'notification':
      return 'notification';
    default:
      return 'custom';
  }
}

function getConfigForNodeTypeFromAction(
  action: DataMatrixAction,
  nodeType: NodeType,
): Record<string, unknown> {
  const firstCheck = action.checks?.[0];
  switch (nodeType) {
    case 'wifiConnect':
      return {
        ssid: action.wifi?.ssid ?? '',
        password: action.wifi?.password ?? '',
        security: action.wifi?.security ?? 'WPA2',
      };
    case 'profileEnrichment':
      return {
        field: firstCheck?.field ?? '',
        required: firstCheck?.required ?? true,
        ifMissingType: firstCheck?.if_missing?.type ?? 'form_request',
      };
    case 'equipmentSession':
      return {
        equipmentId: action.equipment?.id ?? '',
        equipmentType: action.equipment?.type ?? '',
        duration: action.session?.duration ?? 30,
        maxDuration:
          action.session?.max_duration ?? action.session?.duration ?? 30,
        extendable: action.session?.extendable ?? true,
        location: action.equipment?.location ?? 'from_context',
      };
    case 'restaurantOrdering':
      return {
        restaurantId: action.restaurant?.id ?? '',
        table: action.restaurant?.table ?? 'from_context',
      };
    case 'productInteraction':
      return {
        productId: action.product?.id ?? '',
        sku: action.product?.sku ?? '',
      };
    case 'navigate': {
      const url =
        action.navigation?.url ??
        (action.on_complete?.type === 'navigate'
          ? action.on_complete.url
          : '') ??
        '';
      return {
        url,
        params: action.navigation?.params ?? {},
      };
    }
    case 'notification': {
      const notificationTitle =
        action.post_connect?.notification?.title ?? 'Notification';
      const notificationMessage =
        action.post_connect?.notification?.message ??
        (action.on_complete?.type === 'notification'
          ? action.on_complete.message
          : undefined) ??
        '';

      return {
        title: notificationTitle,
        message: notificationMessage,
      };
    }
    default:
      return {};
  }
}

function buildImportedNodeSequence(
  action: DataMatrixAction,
): ImportedFlowNode[] {
  const sequence: ImportedFlowNode[] = [];
  const seen = new Set<string>();

  const add = (type: NodeType, config: Record<string, unknown>) => {
    const key = `${type}:${JSON.stringify(config)}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    sequence.push({ type, config });
  };

  const primaryType = getPrimaryNodeTypeForAction(action.action);

  if (action.wifi && primaryType !== 'wifiConnect') {
    add('wifiConnect', getConfigForNodeTypeFromAction(action, 'wifiConnect'));
  }

  add(primaryType, getConfigForNodeTypeFromAction(action, primaryType));

  if (action.checks?.length && primaryType !== 'profileEnrichment') {
    add(
      'profileEnrichment',
      getConfigForNodeTypeFromAction(action, 'profileEnrichment'),
    );
  }

  if (
    (action.equipment || action.session || action.actions) &&
    primaryType !== 'equipmentSession'
  ) {
    add(
      'equipmentSession',
      getConfigForNodeTypeFromAction(action, 'equipmentSession'),
    );
  }

  if (action.restaurant && primaryType !== 'restaurantOrdering') {
    add(
      'restaurantOrdering',
      getConfigForNodeTypeFromAction(action, 'restaurantOrdering'),
    );
  }

  if (action.product && primaryType !== 'productInteraction') {
    add(
      'productInteraction',
      getConfigForNodeTypeFromAction(action, 'productInteraction'),
    );
  }

  if (
    action.post_connect?.notification ||
    (action.on_complete?.type === 'notification' && action.on_complete.message)
  ) {
    add('notification', getConfigForNodeTypeFromAction(action, 'notification'));
  }

  if (
    action.navigation ||
    (action.on_complete?.type === 'navigate' && action.on_complete.url)
  ) {
    add('navigate', getConfigForNodeTypeFromAction(action, 'navigate'));
  }

  add('runner', {
    mode: 'sequential',
    timeout: 30,
    retries: 3,
    continueOnError: false,
  });

  return sequence;
}

export function buildFlowGraphFromAction(
  action: DataMatrixAction,
  onAddNodeToEdge: (edgeId: string, nodeType: string) => void,
): { nodes: CustomNode[]; edges: Edge[] } {
  const sequence = buildImportedNodeSequence(action);
  const nodes: CustomNode[] = sequence.map((item, index) => {
    const { label, description } = getNodeLabelAndDescription(item.type);
    return {
      id: `imported-${item.type}-${index + 1}`,
      type: item.type,
      position: {
        x: FLOW_IMPORT_START_X + index * FLOW_IMPORT_X_GAP,
        y: FLOW_IMPORT_START_Y,
      },
      data: {
        label,
        description,
        status: 'initial',
        config: item.config,
      },
    };
  });

  const edges: Edge[] = [];
  for (let index = 0; index < nodes.length - 1; index++) {
    const sourceNode = nodes[index];
    const targetNode = nodes[index + 1];
    if (!sourceNode || !targetNode) {
      continue;
    }

    const edgeId = `e-${sourceNode.id}-${targetNode.id}`;
    edges.push({
      id: edgeId,
      source: sourceNode.id,
      target: targetNode.id,
      type: 'default',
      data: {
        onAddNode: onAddNodeToEdge,
      },
      markerEnd: {
        type: 'arrow',
        color: '#94a3b8',
      },
    });
  }

  return {
    nodes,
    edges,
  };
}

// Preview panel component
const PreviewPanel = ({
  action,
  error,
}: {
  action: DataMatrixAction | null;
  error: string | null;
}) => {
  return (
    <Card className="w-80 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {action ? (
            <>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <DataMatrixCode value={action} size={200} format="datamatrix" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Scan this DataMatrix to test your action flow
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mb-4 text-muted-foreground/50" />
              {error ? (
                <p className="text-center max-w-xs text-red-500 dark:text-red-400">
                  {error}
                </p>
              ) : (
                <p className="text-center max-w-xs">
                  Add actions to see a preview of your DataMatrix
                </p>
              )}
            </div>
          )}
        </div>

        {action && (
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Print functionality
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>DataMatrix Code</title>
                        <style>
                          body { 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0; 
                          }
                          img { 
                            max-width: 100%; 
                            height: auto; 
                          }
                        </style>
                      </head>
                      <body>
                        <img src="${document.querySelector('canvas')?.toDataURL()}" alt="DataMatrix Code" />
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Download functionality
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const link = document.createElement('a');
                  link.download = 'datamatrix-code.png';
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            <CopyButton
              copyType="image"
              getImage={async () => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  return new Promise((resolve) => {
                    canvas.toBlob((blob) => resolve(blob));
                  });
                }
                return null;
              }}
              variant="outline"
              size="sm"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Share functionality
                if (navigator.share) {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    canvas.toBlob((blob) => {
                      if (blob) {
                        const file = new File([blob], 'datamatrix-code.png', {
                          type: 'image/png',
                        });
                        navigator
                          .share({
                            title: 'DataMatrix Code',
                            text: 'Scan this DataMatrix code',
                            files: [file],
                          })
                          .catch(() => {
                            // User cancelled or share failed
                          });
                      }
                    });
                  }
                } else {
                  toast.info('Sharing is not supported on this device');
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Flow Builder Component
const FlowBuilder = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setNodes,
    setEdges,
    onAddNode,
    onAddNodeToEdge,
    onConnect,
    setIsDraggingNode,
  } = useFlow();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewAction, setPreviewAction] = useState<DataMatrixAction | null>(
    null,
  );
  const [isPreviewValid, setIsPreviewValid] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // State for drag and drop
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // Drag and drop handlers for React Flow
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Check if we have a valid reactFlowInstance
      if (!reactFlowInstance) return;

      // Get the node type from dataTransfer
      const nodeType = event.dataTransfer.getData('application/reactflow');

      // Check if the dropped element is valid
      if (!nodeType || !nodeTypes[nodeType as NodeType]) return;

      // Convert screen coordinates to flow coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Get label and description for the node type
      const { label, description } = getNodeLabelAndDescription(
        nodeType as NodeType,
      );

      // Create new node
      const newNode: CustomNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType as NodeType,
        position,
        data: {
          label,
          description,
          status: 'initial',
          config: {},
        },
      };

      // Add the new node to the flow
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragType = active.data.current?.type as string;
    setActiveDragType(dragType);
    setIsDraggingNode(true);
  };

  const getClientPositionFromEvent = useCallback((event: Event | null) => {
    if (!event) return null;

    const pointerEvent = event as Event & {
      clientX?: unknown;
      clientY?: unknown;
    };
    if (
      typeof pointerEvent.clientX === 'number' &&
      typeof pointerEvent.clientY === 'number'
    ) {
      return { x: pointerEvent.clientX, y: pointerEvent.clientY };
    }

    if ('changedTouches' in event) {
      const touchEvent = event as TouchEvent;
      const touch = touchEvent.changedTouches[0] ?? touchEvent.touches[0];
      if (!touch) return null;
      return { x: touch.clientX, y: touch.clientY };
    }

    return null;
  }, []);

  const onDragMove = (event: DragMoveEvent) => {
    if (!reactFlowInstance) return;
    const clientPosition = getClientPositionFromEvent(event.activatorEvent);
    if (!clientPosition) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: clientPosition.x,
      y: clientPosition.y,
    });

    setDragPreviewPosition(position);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);
    setIsDraggingNode(false);
    setDragPreviewPosition(null);

    // Check if we're dropping on the flow area
    if (over?.id === 'flow-canvas' && reactFlowInstance) {
      const clientPosition = getClientPositionFromEvent(event.activatorEvent);
      if (!clientPosition) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: clientPosition.x,
        y: clientPosition.y,
      });

      const nodeType = active.data.current?.type as NodeType;
      if (nodeType) {
        const { label, description } = getNodeLabelAndDescription(nodeType);

        const newNode: CustomNode = {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          position,
          data: {
            label,
            description,
            status: 'initial',
            config: {},
          },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    }
  };

  const onUpdateNode = useCallback(
    (id: string, data: BaseNodeData) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === id ? { ...node, data } : node)),
      );
    },
    [setNodes],
  );

  type PreviewBuildState = {
    action: DataMatrixAction | null;
    error: string | null;
  };

  // Generate preview action from nodes and edges
  const generatePreviewAction = useCallback((): PreviewBuildState => {
    const buildResult = buildDataMatrixActionFromFlowGraph(
      nodes as FlowBuilderNode[],
      edges as FlowBuilderEdge[],
    );
    if (!buildResult.action) {
      const errorMessage =
        buildResult.errors[0] ?? 'Invalid action configuration';
      setPreviewAction(null);
      setIsPreviewValid(false);
      setPreviewError(errorMessage);
      return {
        action: null,
        error: errorMessage,
      };
    }

    setPreviewAction(buildResult.action);
    setIsPreviewValid(true);
    setPreviewError(null);
    return {
      action: buildResult.action,
      error: null,
    };
  }, [edges, nodes]);

  // Generate preview when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      generatePreviewAction();
    } else {
      setPreviewAction(null);
      setIsPreviewValid(true);
      setPreviewError(null);
    }
  }, [nodes, generatePreviewAction]);

  // Export functionality to generate DataMatrixAction object
  const exportFlow = useCallback(() => {
    const { action, error } = generatePreviewAction();
    if (action && isPreviewValid) {
      const dataStr = JSON.stringify(action, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

      const exportFileDefaultName = 'datamatrix-flow.json';

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast.success('Flow exported successfully');
    } else {
      toast.error(error ?? previewError ?? 'Cannot export invalid flow');
    }
  }, [generatePreviewAction, isPreviewValid, previewError]);

  // Import functionality to load DataMatrixAction object
  const importFlow = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          const action = dataMatrixActionSchema.parse(parsed);
          const importedGraph = buildFlowGraphFromAction(
            action,
            onAddNodeToEdge,
          );
          setNodes(importedGraph.nodes);
          setEdges(importedGraph.edges);
          setSelectedNodeId(null);
          setPreviewAction(action);
          setIsPreviewValid(true);
          setPreviewError(null);
          toast.success(
            `Flow imported successfully (${importedGraph.nodes.length} nodes)`,
          );
        } catch (error) {
          console.error('Failed to import flow', error);
          toast.error(
            error instanceof Error
              ? `Failed to import flow: ${error.message}`
              : 'Failed to import flow',
          );
        }
      };
      reader.readAsText(file);

      // Allow importing the same file again.
      event.target.value = '';
    },
    [onAddNodeToEdge, setEdges, setNodes],
  );

  // Auto-layout functionality
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Workflow runner functionality
  const [isRunning, setIsRunning] = useState(false);
  const runWorkflow = useCallback(async () => {
    const { action, error } = generatePreviewAction();
    if (!action) {
      toast.error(
        error ??
          previewError ??
          'Cannot run workflow: invalid action configuration',
      );
      return;
    }

    setIsRunning(true);

    try {
      await executeWorkflowWithStatusTransitions({
        action,
        nodes: nodes as RunnerStatusNode[],
        setNodes: (updater) =>
          setNodes(
            (currentNodes) =>
              updater(currentNodes as RunnerStatusNode[]) as CustomNode[],
          ),
        executeAction: async (nextAction) => {
          const executor = new ActionExecutor(nextAction);
          await executor.execute();
        },
      });
      toast.success('Workflow executed successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown execution failure';
      toast.error(`Failed to execute workflow: ${message}`);
      console.error('Workflow execution error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [generatePreviewAction, nodes, previewError, setNodes]);

  // Helper function to render node preview for drag overlay
  const renderNodePreview = (type: NodeType) => {
    const { label, description } = getNodeLabelAndDescription(type);

    // Get the appropriate node component based on type
    switch (type) {
      case 'wifiConnect':
        return (
          <BaseNode className="w-48 bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 dark:border-blue-600/30 text-blue-900 dark:text-blue-100 shadow-sm">
            <BaseNodeHeader className="text-blue-900 dark:text-blue-100">
              <BaseNodeHeaderTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                {label}
              </BaseNodeHeaderTitle>
            </BaseNodeHeader>
            <BaseNodeContent className="p-2 text-xs text-blue-900 dark:text-blue-100">
              {description && <div className="mb-2">{description}</div>}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>SSID:</span>
                  <span className="font-mono">Not set</span>
                </div>
                <div className="flex justify-between">
                  <span>Security:</span>
                  <span>WPA2</span>
                </div>
              </div>
            </BaseNodeContent>
          </BaseNode>
        );
      // Add cases for other node types as needed
      default:
        return (
          <BaseNode className="w-48 bg-gray-500/20 dark:bg-gray-600/20 backdrop-blur-sm border border-gray-500/30 dark:border-gray-600/30 text-gray-900 dark:text-gray-100 shadow-sm">
            <BaseNodeHeader className="text-gray-900 dark:text-gray-100">
              <BaseNodeHeaderTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Database className="h-4 w-4" />
                {label}
              </BaseNodeHeaderTitle>
            </BaseNodeHeader>
            <BaseNodeContent className="p-2 text-xs text-gray-900 dark:text-gray-100">
              {description && <div>{description}</div>}
            </BaseNodeContent>
          </BaseNode>
        );
    }
  };

  // State for workflow locking
  const [isLocked, setIsLocked] = useState(false);

  // Toggle workflow lock
  const toggleLock = useCallback(() => {
    setIsLocked((prev) => !prev);
    toast.info(`Workflow ${isLocked ? 'unlocked' : 'locked'}`);
  }, [isLocked]);

  // Function to calculate helper lines for node alignment
  // const calculateHelperLines = useCallback((nodeId: string, position: { x: number, y: number }) => {
  //   const horizontalLines: number[] = [];
  //   const verticalLines: number[] = [];

  //   // Get all other nodes
  //   const otherNodes = nodes.filter(node => node.id !== nodeId);

  //   // Check for alignment with other nodes
  //   otherNodes.forEach(otherNode => {
  //     if (otherNode.position) {
  //       // Horizontal alignment (same Y position)
  //       if (Math.abs(otherNode.position.y - position.y) < 10) {
  //         horizontalLines.push(otherNode.position.y);
  //       }

  //       // Vertical alignment (same X position)
  //       if (Math.abs(otherNode.position.x - position.x) < 10) {
  //         verticalLines.push(otherNode.position.x);
  //       }
  //     }
  //   });

  //   setHelperLines({ horizontal: horizontalLines, vertical: verticalLines });
  // }, [nodes]);

  // Function to snap node to helper lines
  // const snapToHelperLines = useCallback((position: { x: number, y: number }) => {
  //   let newX = position.x;
  //   let newY = position.y;
  //   let snapped = false;

  //   // Snap to horizontal lines
  //   helperLines.horizontal.forEach(lineY => {
  //     if (Math.abs(position.y - lineY) < 10) {
  //       newY = lineY;
  //       snapped = true;
  //     }
  //   });

  //   // Snap to vertical lines
  //   helperLines.vertical.forEach(lineX => {
  //     if (Math.abs(position.x - lineX) < 10) {
  //       newX = lineX;
  //       snapped = true;
  //     }
  //   });

  //   return { x: newX, y: newY, snapped };
  // }, [helperLines]);

  return (
    <div className="w-full h-[700px] flex border rounded-lg overflow-hidden bg-background [&_.react-flow__attribution]:hidden">
      {/* Left sidebar - Node library */}
      <div className="w-64 border-r bg-background">
        <NodeLibrary onAddNode={onAddNode} />
      </div>

      {/* Main flow area */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        >
          <DragOverlay>
            {activeDragType && (
              <div className="opacity-80 pointer-events-none">
                {renderNodePreview(activeDragType as NodeType)}
              </div>
            )}
          </DragOverlay>
          {dragPreviewPosition && (
            <div
              className="absolute w-48 h-24 border-2 border-dashed border-blue-500 rounded-md bg-blue-500/10 pointer-events-none"
              style={{
                left: dragPreviewPosition.x,
                top: dragPreviewPosition.y,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </DndContext>
        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isLocked ? undefined : onNodesChange}
          onEdgesChange={isLocked ? undefined : onEdgesChange}
          onConnect={isLocked ? undefined : onConnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setIsDrawerOpen(true);
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="react-flow-theme-dark bg-background"
          id="flow-canvas"
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <svg role="img" aria-label="Flow Builder">
            <defs>
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>
          <Background
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
            color="#94a3b8"
          />
          <ZoomSlider />
          <Panel position="top-right" className="flex gap-2">
            <TooltipProvider>
              <div className="flex flex-col rounded-md border overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={() => reactFlowInstance.fitView()}
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Fit View</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={onLayout}
                    >
                      <svg
                        role="img"
                        aria-label="Auto Layout"
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Auto Layout</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Run Workflow"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={runWorkflow}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Run Workflow</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={exportFlow}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Export Flow</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={() =>
                        document.getElementById('import-flow')?.click()
                      }
                    >
                      <Upload className="h-4 w-4" />
                      {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
                      <input
                        id="import-flow"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={importFlow}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Import Flow</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={() => {
                        setNodes([]);
                        setEdges([]);
                        setSelectedNodeId(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Clear Canvas</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isLocked ? 'default' : 'outline'}
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={() => {
                        setSelectedNodeId(null);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Preview</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isLocked ? 'default' : 'outline'}
                      size="icon"
                      className="rounded-none border-0 border-b last:border-b-0"
                      onClick={toggleLock}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{isLocked ? 'Unlock Workflow' : 'Lock Workflow'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </Panel>
        </ReactFlow>
      </div>

      {/* Drawer for node configuration */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        direction="right"
      >
        <DrawerContent className="max-w-[100vw] sm:max-w-sm ml-auto">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>
              {selectedNode ? selectedNode.data.label : 'Configuration'}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode ? (
              <NodeSetupPanel
                selectedNode={selectedNode}
                onUpdateNode={onUpdateNode}
              />
            ) : (
              <PreviewPanel action={previewAction} error={previewError} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

// Main component wrapper
export function VisualFlowBuilder() {
  return (
    <div className="w-full">
      <ReactFlowProvider>
        <FlowProvider>
          <FlowBuilder />
        </FlowProvider>
      </ReactFlowProvider>
    </div>
  );
}
