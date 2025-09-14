"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useWifiNetworks } from "@/hooks/use-wifi";
import {
  ArrowRight,
  Bell,
  Circle,
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
  Trash,
  Unlock,
  Upload,
  User,
  Wifi,
  X
} from "lucide-react";

import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";

import { CopyButton } from "@/components/ui/copy-button";
import { DataMatrixCode } from "@/components/ui/datamatrix-code";
import { type DataMatrixAction, dataMatrixActionSchema } from "@/lib/datamatrix";
import { toast } from "sonner";

import { AnimatedSvgEdge } from "@/components/animated-svg-edge";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { CustomEdge, type CustomEdgeData } from "@/components/custom-edge";
import { flowNodeTypes } from "@/components/custom-flow-nodes";
import { DataEdge } from "@/components/data-edge";
import { NodeStats } from "@/components/node-stats";
import { type NodeStatus, NodeStatusIndicator } from "@/components/node-status-indicator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomSlider } from "@/components/zoom-slider";
import { getLayoutedElements } from "@/lib/auto-layout-utils";
import { BaseHandle } from "../base-handle";
import { ScrollArea } from "../ui/scroll-area";

// Define custom node types
type NodeType =
  | "wifiConnect"
  | "profileEnrichment"
  | "equipmentSession"
  | "restaurantOrdering"
  | "productInteraction"
  | "navigate"
  | "notification"
  | "condition"
  | "loop"
  | "apiCall"
  | "custom"
  | "runner" // Add runner node type
  // Custom flow node types with special shapes
  | "input"
  | "output"
  | "process"
  | "predefined"
  | "document";

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
}

// Helper function to get fixed label and description for each node type
const getNodeLabelAndDescription = (type: NodeType) => {
  switch (type) {
    case "wifiConnect":
      return { label: "WiFi Connection", description: "Connect to a WiFi network" };
    case "profileEnrichment":
      return { label: "Profile Enrichment", description: "Collect user profile information" };
    case "equipmentSession":
      return { label: "Equipment Session", description: "Manage equipment access session" };
    case "restaurantOrdering":
      return { label: "Restaurant Ordering", description: "Place restaurant orders" };
    case "productInteraction":
      return { label: "Product Interaction", description: "Interact with products" };
    case "navigate":
      return { label: "Navigation", description: "Navigate to a URL" };
    case "notification":
      return { label: "Notification", description: "Send a notification" };
    case "condition":
      return { label: "Condition", description: "Conditional branching" };
    case "loop":
      return { label: "Loop", description: "Repeat a set of actions" };
    case "apiCall":
      return { label: "API Call", description: "Make an API request" };
    case "runner":
      return { label: "Workflow Runner", description: "Execute and monitor workflow" };
    // Custom flow node types
    case "input":
      return { label: "Input", description: "Input data or parameters" };
    case "output":
      return { label: "Output", description: "Output results or data" };
    case "process":
      return { label: "Process", description: "Process or transformation" };
    case "predefined":
      return { label: "Predefined Process", description: "Predefined or named process" };
    case "document":
      return { label: "Document", description: "Document or report generation" };
    default:
      return { label: type, description: `Configure this ${type} node` };
  }
};

interface CustomNode extends Node<BaseNodeData> {
  type: NodeType;
}

function DeleteNodeButton({ id }: { id: string }) {
  const { setNodes } = useReactFlow();

  const handleDelete = useCallback(() => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="link"
          className="nodrag p-1 text-white"
          onClick={handleDelete}
        >
          <Trash className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Delete Node</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
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
}

const WifiConnectNode = ({ data, id }: NodeProps<Node<WifiConnectNodeData>>) => {
  // Calculate progress based on stats
  const progress = data.stats?.progress ??
    (data.stats?.completed && data.stats?.started ?
      (data.stats.completed / data.stats.started) * 100 : 0);

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
              <span className="font-mono">{data.config?.ssid || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Security:</span>
              <span>{data.config?.security || "WPA2"}</span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === "loading" && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="wifi-input"
          className="bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="wifi-output"
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
}

const ProfileEnrichmentNode = ({ data, id }: NodeProps<Node<ProfileEnrichmentNodeData>>) => {
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
              <span className="font-mono">{data.config?.field || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Required:</span>
              <span>{data.config?.required ? "Yes" : "No"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="profile-input"
          className="bg-purple-500 dark:bg-purple-600 border-purple-600 dark:border-purple-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="profile-output"
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

const EquipmentSessionNode = ({ data, id }: NodeProps<Node<EquipmentSessionNodeData>>) => {
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
              <span className="font-mono">{data.config?.equipmentId || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{data.config?.duration || "30"} min</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="equipment-input"
          className="bg-orange-500 dark:bg-orange-600 border-orange-600 dark:border-orange-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="equipment-output"
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

const RestaurantOrderingNode = ({ data, id }: NodeProps<Node<RestaurantOrderingNodeData>>) => {
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
              <span className="font-mono">{data.config?.restaurantId || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Table:</span>
              <span>{data.config?.table || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="restaurant-input"
          className="bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="restaurant-output"
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

const ProductInteractionNode = ({ data, id }: NodeProps<Node<ProductInteractionNodeData>>) => {
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
              <span className="font-mono">{data.config?.productId || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>SKU:</span>
              <span>{data.config?.sku || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="product-input"
          className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="product-output"
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
              <span className="font-mono truncate max-w-[100px]">{data.config?.url || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="navigate-input"
          className="bg-cyan-500 dark:bg-cyan-600 border-cyan-600 dark:border-cyan-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="navigate-output"
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

const NotificationNode = ({ data, id }: NodeProps<Node<NotificationNodeData>>) => {
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
              <span className="font-mono truncate max-w-[100px]">{data.config?.title || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="notification-input"
          className="bg-pink-500 dark:bg-pink-600 border-pink-600 dark:border-pink-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="notification-output"
          className="bg-pink-500 dark:bg-pink-600 border-pink-600 dark:border-pink-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

type ConditionNodeData = {
  label: string;
  status: NodeStatus;
  condition: string;
  description: string;
  config: {
    condition: string;
    truePath: string;
    falsePath: string;
  };
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
};

type LoopNodeData = {
  label: string;
  status: NodeStatus;
  iterations: number;
  description: string;
  config: {
    iterations: number;
    loopVariable: string;
  };
  stats: {
    progress: number;
    completed: number;
    started: number;
  };
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
}

const APICallNode = ({ data, id }: NodeProps<Node<ApiCallNodeData>>) => {
  // Calculate progress based on stats
  const progress = data.stats?.progress ??
    (data.stats?.completed && data.stats?.started ?
      (data.stats.completed / data.stats.started) * 100 : 0);

  // Get method-specific color
  const method = data.config?.method || "GET";
  const methodColors = {
    GET: "bg-emerald-500",
    POST: "bg-blue-500",
    PUT: "bg-amber-500",
    DELETE: "bg-red-500",
    PATCH: "bg-purple-500",
  };
  const methodColor = methodColors[method as keyof typeof methodColors] || "bg-emerald-500";

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-emerald-500/20 dark:bg-emerald-600/20 backdrop-blur-sm border border-emerald-500/30 dark:border-emerald-600/30 text-emerald-900 dark:text-emerald-100 shadow-sm">
        <BaseNodeHeader className="text-emerald-900 dark:text-emerald-100">
          <BaseNodeHeaderTitle className="text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <svg
              role="img" aria-label="DataMatrix Scanner"
              xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
              <span className="font-mono truncate max-w-[100px]">{data.config?.url || "Not set"}</span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === "loading" && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="api-input"
          className="bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="api-output"
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
}

const RunnerNode = ({ data, id }: NodeProps<Node<RunnerNodeData>>) => {
  // Calculate progress based on stats
  const progress = data.stats?.progress ??
    (data.stats?.completed && data.stats?.started ?
      (data.stats.completed / data.stats.started) * 100 : 0);

  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-violet-500/20 dark:bg-violet-600/20 backdrop-blur-sm border border-violet-500/30 dark:border-violet-600/30 text-violet-900 dark:text-violet-100 shadow-sm">
        <BaseNodeHeader className="text-violet-900 dark:text-violet-100">
          <BaseNodeHeaderTitle className="text-violet-900 dark:text-violet-100 flex items-center gap-2">
            <svg
              role="img" aria-label="Workflow Runner"
              xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
              <span className="capitalize">{data.status || "idle"}</span>
            </div>
            <div className="flex justify-between">
              <span>Mode:</span>
              <span>{data.config?.mode || "sequential"}</span>
            </div>
          </div>
          <NodeStats stats={data.stats} className="mt-2" />
          {data.status === "loading" && (
            <div className="mt-2">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="runner-input"
          className="bg-violet-500 dark:bg-violet-600 border-violet-600 dark:border-violet-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="runner-output"
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
  onAddNode
}: {
  nodeType: {
    type: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    order?: number;
  };
  onAddNode: (type: NodeType) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `node-library-${nodeType.type}`,
    data: { type: nodeType.type },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = nodeType.icon;

  // Native drag start handler for HTML5 drag and drop
  const onNativeDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', nodeType.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="w-full"
      draggable
      onDragStart={onNativeDragStart}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start cursor-grab active:cursor-grabbing gap-2"
              onClick={() => onAddNode(nodeType.type as NodeType)}
            >
              <div className={`w-3 h-3 rounded-full ${nodeType.color}`} />
              <Icon className="h-4 w-4" />
              <p className="text-left overflow-ellipsis line-clamp-1">{nodeType.label}</p>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{nodeType.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Sidebar component for node library with drag and drop
const NodeLibrary = ({ onAddNode }: { onAddNode: (type: NodeType) => void }) => {
  // Define node types with all properties including icon
  const nodeTypesDefinition = [
    { type: "wifiConnect", label: "WiFi Connection", icon: Wifi, color: "bg-blue-500/20 dark:bg-blue-600/20", order: 2 },
    { type: "profileEnrichment", label: "Profile Enrichment", icon: User, color: "bg-purple-500/20 dark:bg-purple-600/20", order: 3 },
    { type: "equipmentSession", label: "Equipment Session", icon: Settings, color: "bg-orange-500/20 dark:bg-orange-600/20", order: 4 },
    { type: "restaurantOrdering", label: "Restaurant Ordering", icon: ShoppingCart, color: "bg-amber-500/20 dark:bg-amber-600/20", order: 5 },
    { type: "productInteraction", label: "Product Interaction", icon: Database, color: "bg-teal-500/20 dark:bg-teal-600/20", order: 6 },
    { type: "navigate", label: "Navigation", icon: Navigation, color: "bg-cyan-500/20 dark:bg-cyan-600/20", order: 7 },
    { type: "notification", label: "Notification", icon: Bell, color: "bg-pink-500/20 dark:bg-pink-600/20", order: 8 },
    { type: "condition", label: "Condition", icon: GripVertical, color: "bg-yellow-500/20 dark:bg-yellow-600/20", order: 9 },
    { type: "loop", label: "Loop", icon: Repeat, color: "bg-indigo-500/20 dark:bg-indigo-600/20", order: 10 },
    { type: "apiCall", label: "API Call", icon: Globe, color: "bg-emerald-500/20 dark:bg-emerald-600/20", order: 11 },
    { type: "runner", label: "Workflow Runner", icon: Play, color: "bg-violet-500/20 dark:bg-violet-600/20", order: 12 },
    // Custom flow nodes with special shapes
    { type: "start", label: "Start", icon: Circle, color: "bg-green-500/20 dark:bg-green-600/20", order: 13 },
    { type: "end", label: "End", icon: Circle, color: "bg-red-500/20 dark:bg-red-600/20", order: 14 },
    { type: "input", label: "Input", icon: ArrowRight, color: "bg-blue-500/20 dark:bg-blue-600/20", order: 15 },
    { type: "output", label: "Output", icon: ArrowRight, color: "bg-blue-500/20 dark:bg-blue-600/20", order: 16 },
    { type: "process", label: "Process", icon: Square, color: "bg-purple-500/20 dark:bg-purple-600/20", order: 17 },
    { type: "predefined", label: "Predefined Process", icon: Square, color: "bg-indigo-500/20 dark:bg-indigo-600/20", order: 18 },
    { type: "document", label: "Document", icon: FileText, color: "bg-amber-500/20 dark:bg-amber-600/20", order: 19 },
  ];

  // Serializable node type data for storage (without icon)
  type StoredNodeType = Omit<typeof nodeTypesDefinition[number], 'icon'>;

  // Default node types for storage (without icon)
  const defaultStoredNodeTypes: StoredNodeType[] = nodeTypesDefinition.map(({ icon, ...rest }) => rest);

  // Get stored order from localStorage or use default
  const getNodeLibraryOrder = (): typeof nodeTypesDefinition => {
    try {
      const storedOrder = localStorage.getItem('nodeLibraryOrder');
      if (storedOrder) {
        const parsedOrder: StoredNodeType[] = JSON.parse(storedOrder);
        // Merge with default to ensure all node types are present
        return nodeTypesDefinition.map(defaultNode => {
          const storedNode = parsedOrder.find(n => n.type === defaultNode.type);
          return storedNode ? { ...defaultNode, ...storedNode } : defaultNode;
        }).sort((a, b) => (a.order ?? defaultStoredNodeTypes.findIndex(n => n.type === a.type)) - (b.order ?? defaultStoredNodeTypes.findIndex(n => n.type === b.type)));
      }
    } catch (error) {
      console.error('Error parsing node library order from localStorage:', error);
    }
    return nodeTypesDefinition;
  };

  const [nodeTypes, setNodeTypes] = useState(getNodeLibraryOrder());

  // Save order to localStorage when it changes
  const saveNodeLibraryOrder = (newOrder: typeof nodeTypesDefinition) => {
    try {
      // Remove icons before storing
      const serializableOrder = newOrder.map(({ icon, ...rest }) => rest);
      localStorage.setItem('nodeLibraryOrder', JSON.stringify(serializableOrder));
    } catch (error) {
      console.error('Error saving node library order to localStorage:', error);
    }
  };

  // Handle reordering
  const handleReorder = (newOrder: typeof nodeTypesDefinition) => {
    setNodeTypes(newOrder);
    saveNodeLibraryOrder(newOrder);
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
              onClick={() => {
                setNodeTypes(nodeTypesDefinition);
                saveNodeLibraryOrder(nodeTypesDefinition);
              }}
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
        <ScrollArea>
          <Sortable
            value={nodeTypes}
            onValueChange={handleReorder}
            getItemValue={(item) => item.type}
          >
            <SortableContent asChild>
              <div className="space-y-2">
                {nodeTypes.map((nodeType) => (
                  <SortableItem key={nodeType.type} value={nodeType.type} asChild>
                    <div className="flex items-center gap-2">
                      <SortableItemHandle asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </SortableItemHandle>
                      <DraggableNode
                        nodeType={nodeType}
                        onAddNode={onAddNode}
                      />
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContent>
            <SortableOverlay>
              {(props) => (
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
  onUpdateNode
}: {
  selectedNode: CustomNode;
  onUpdateNode: (id: string, data: BaseNodeData) => void;
}) => {
  const handleConfigChange = (key: string, value: any) => {
    const updatedConfig = {
      ...selectedNode.data.config,
      [key]: value
    };

    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      config: updatedConfig
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
          <NodeSetupForm selectedNode={selectedNode} handleConfigChange={handleConfigChange} />

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
const NodeSetupForm = ({ selectedNode, handleConfigChange }: { selectedNode: CustomNode, handleConfigChange: (key: string, value: any) => void }) => {
  switch (selectedNode.type) {
    case "wifiConnect": {
      // Use our WiFi hook for real network scanning
      const {
        wifiScanResult,
        isScanning,
        scanNetworks,
        wifiScanError,
        isScanError
      } = useWifiNetworks();

      // Get available networks from scan result or use mock data as fallback
      const availableNetworks = wifiScanResult?.success ?
        wifiScanResult.networks.map((net: any) => net.ssid) :
        ["HomeNetwork", "OfficeWiFi", "CoffeeShop-Guest", "NeighborNetwork"];

      // Handle network selection from dropdown or direct input
      const handleNetworkChange = (value: string) => {
        handleConfigChange("ssid", value);

        // If it's a known network, also set the security type
        const network = wifiScanResult?.success ?
          wifiScanResult.networks.find((net: any) => net.ssid === value) :
          [
            { ssid: "HomeNetwork", security: "WPA2" },
            { ssid: "OfficeWiFi", security: "WPA3" },
            { ssid: "CoffeeShop-Guest", security: "open" },
            { ssid: "NeighborNetwork", security: "WPA2" },
          ].find(net => net.ssid === value);

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
                <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan'}
              </Button>
            </div>

            {isScanError && (
              <div className="text-sm text-red-500">
                Error scanning networks: {wifiScanError?.message || 'Unknown error'}
              </div>
            )}

            <div className="space-y-2">
              <Label>Network Name (SSID)</Label>
              <CustomSelect
                value={selectedNode.data.config?.ssid as string || ""}
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
            <Input
              id="password"
              type="password"
              value={(selectedNode.data.config?.password as string) || ""}
              onChange={(e) => handleConfigChange("password", e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="security">Security Type</Label>
            <Select
              value={(selectedNode.data.config?.security as string) || "WPA2"}
              onValueChange={(value) => handleConfigChange("security", value)}
            >
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

    case "navigate":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={(selectedNode.data.config?.url as string) || ""}
              onChange={(e) => handleConfigChange("url", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="params">URL Parameters</Label>
            <Textarea
              id="params"
              value={selectedNode.data.config?.paramsRaw as string || JSON.stringify(selectedNode.data.config?.params || {}, null, 2)}
              onChange={(e) => handleConfigChange("paramsRaw", e.target.value)}
              onBlur={(e) => {
                try {
                  const params = JSON.parse(e.target.value);
                  handleConfigChange("params", params);
                  handleConfigChange("paramsRaw", undefined);
                  toast.success("Parameters updated successfully");
                } catch (error) {
                  toast.error("Invalid JSON in parameters");
                }
              }}
              placeholder='{"param1": "value1", "param2": "value2"}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter parameters as JSON key-value pairs. Press Tab or click outside to save.
            </p>
          </div>
        </div>
      );

    case "notification":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={(selectedNode.data.config?.title as string) || ""}
              onChange={(e) => handleConfigChange("title", e.target.value)}
              placeholder="Notification title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={(selectedNode.data.config?.message as string) || ""}
              onChange={(e) => handleConfigChange("message", e.target.value)}
              placeholder="Notification message"
              rows={3}
            />
          </div>
        </div>
      );

    case "profileEnrichment":
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
            <Input
              id="field"
              value={(selectedNode.data.config?.field as string) || ""}
              onChange={(e) => handleConfigChange("field", e.target.value)}
              placeholder="e.g., emergency_contact"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={selectedNode.data.config?.required === true}
              onCheckedChange={(checked) => handleConfigChange("required", checked)}
            />
            <Label htmlFor="required">Field Required</Label>
          </div>
        </div>
      );

    case "equipmentSession":
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
            <Input
              id="equipmentId"
              value={(selectedNode.data.config?.equipmentId as string) || ""}
              onChange={(e) => handleConfigChange("equipmentId", e.target.value)}
              placeholder="e.g., treadmill_001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipmentType">Equipment Type</Label>
            <Input
              id="equipmentType"
              value={(selectedNode.data.config?.equipmentType as string) || ""}
              onChange={(e) => handleConfigChange("equipmentType", e.target.value)}
              placeholder="e.g., cardio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Session Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={(selectedNode.data.config?.duration as number) || ""}
              onChange={(e) => handleConfigChange("duration", Number.parseInt(e.target.value) || 0)}
              placeholder="30"
            />
          </div>
        </div>
      );

    case "restaurantOrdering":
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
            <Input
              id="restaurantId"
              value={(selectedNode.data.config?.restaurantId as string) || ""}
              onChange={(e) => handleConfigChange("restaurantId", e.target.value)}
              placeholder="e.g., anjal_restaurant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table">Table Identifier</Label>
            <Input
              id="table"
              value={(selectedNode.data.config?.table as string) || ""}
              onChange={(e) => handleConfigChange("table", e.target.value)}
              placeholder="e.g., table_5 or from_context"
            />
          </div>
        </div>
      );

    case "productInteraction":
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
            <Input
              id="productId"
              value={(selectedNode.data.config?.productId as string) || ""}
              onChange={(e) => handleConfigChange("productId", e.target.value)}
              placeholder="e.g., smart_watch_x1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">Product SKU</Label>
            <Input
              id="sku"
              value={(selectedNode.data.config?.sku as string) || ""}
              onChange={(e) => handleConfigChange("sku", e.target.value)}
              placeholder="e.g., SW-X1-BLK-001"
            />
          </div>
        </div>
      );

    case "condition":
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
            <Input
              id="condition"
              value={(selectedNode.data.config?.condition as string) || ""}
              onChange={(e) => handleConfigChange("condition", e.target.value)}
              placeholder="e.g., user.age > 18"
            />
            <p className="text-xs text-muted-foreground">
              Use JavaScript expressions. Available variables: user, context, data
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="truePath">True Path Label</Label>
            <Input
              id="truePath"
              value={(selectedNode.data.config?.truePath as string) || "True"}
              onChange={(e) => handleConfigChange("truePath", e.target.value)}
              placeholder="e.g., Adult Content"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="falsePath">False Path Label</Label>
            <Input
              id="falsePath"
              value={(selectedNode.data.config?.falsePath as string) || "False"}
              onChange={(e) => handleConfigChange("falsePath", e.target.value)}
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

    case "loop":
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
            <Input
              id="iterations"
              type="number"
              value={(selectedNode.data.config?.iterations as number) || ""}
              onChange={(e) => handleConfigChange("iterations", Number.parseInt(e.target.value) || 0)}
              placeholder="e.g., 5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loopVariable">Loop Variable Name</Label>
            <Input
              id="loopVariable"
              value={(selectedNode.data.config?.loopVariable as string) || "item"}
              onChange={(e) => handleConfigChange("loopVariable", e.target.value)}
              placeholder="e.g., item, user, product"
            />
          </div>
        </div>
      );

    case "apiCall":
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
              value={(selectedNode.data.config?.method as string) || "GET"}
              onValueChange={(value) => handleConfigChange("method", value)}
            >
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
            <Input
              id="url"
              value={(selectedNode.data.config?.url as string) || ""}
              onChange={(e) => handleConfigChange("url", e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headers">Headers (JSON)</Label>
            <Textarea
              id="headers"
              value={selectedNode.data.config?.headersRaw as string || JSON.stringify(selectedNode.data.config?.headers || {}, null, 2)}
              onChange={(e) => handleConfigChange("headersRaw", e.target.value)}
              onBlur={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  handleConfigChange("headers", headers);
                  handleConfigChange("headersRaw", undefined);
                  toast.success("Headers updated successfully");
                } catch (error) {
                  toast.error("Invalid JSON in headers");
                }
              }}
              placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Request Body (JSON)</Label>
            <Textarea
              id="body"
              value={selectedNode.data.config?.bodyRaw as string || JSON.stringify(selectedNode.data.config?.body || {}, null, 2)}
              onChange={(e) => handleConfigChange("bodyRaw", e.target.value)}
              onBlur={(e) => {
                try {
                  const body = JSON.parse(e.target.value);
                  handleConfigChange("body", body);
                  handleConfigChange("bodyRaw", undefined);
                  toast.success("Body updated successfully");
                } catch (error) {
                  toast.error("Invalid JSON in body");
                }
              }}
              placeholder='{"key": "value"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    case "runner":
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
              value={(selectedNode.data.config?.mode as string) || "sequential"}
              onValueChange={(value) => handleConfigChange("mode", value)}
            >
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
            <Input
              id="timeout"
              type="number"
              value={(selectedNode.data.config?.timeout as number) || 30}
              onChange={(e) => handleConfigChange("timeout", Number.parseInt(e.target.value) || 30)}
              placeholder="30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retries">Max Retries</Label>
            <Input
              id="retries"
              type="number"
              value={(selectedNode.data.config?.retries as number) || 3}
              onChange={(e) => handleConfigChange("retries", Number.parseInt(e.target.value) || 3)}
              placeholder="3"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="continueOnError"
              checked={selectedNode.data.config?.continueOnError === true}
              onCheckedChange={(checked) => handleConfigChange("continueOnError", checked)}
            />
            <Label htmlFor="continueOnError">Continue on Error</Label>
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

// Preview panel component
const PreviewPanel = ({ action }: { action: DataMatrixAction | null }) => {
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
                <DataMatrixCode
                  value={action}
                  size={200}
                  format="datamatrix"
                />
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
              <p className="text-center max-w-xs">
                Add actions to see a preview of your DataMatrix
              </p>
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
                        const file = new File([blob], 'datamatrix-code.png', { type: 'image/png' });
                        navigator.share({
                          title: 'DataMatrix Code',
                          text: 'Scan this DataMatrix code',
                          files: [file]
                        }).catch(() => {
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
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<CustomEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewAction, setPreviewAction] = useState<DataMatrixAction | null>(null);
  const [isPreviewValid, setIsPreviewValid] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // State for drag and drop
  const [activeDragType, setActiveDragType] = useState<string | null>(null);

  // Custom onEdgesChange that ensures all edges have the onAddNode function
  const customOnEdgesChange = useCallback((changes: any) => {
    // Process changes to add onAddNode function to all edges
    const processedChanges = changes.map((change: any) => {
      if (change.type === 'add' && change.item) {
        const updatedItem = { ...change.item };

        // Add onAddNode function if missing
        if (!updatedItem.data?.onAddNode) {
          updatedItem.data = {
            ...(updatedItem.data || {}),
            onAddNode: onAddNodeToEdge
          };
        }

        // Add markerEnd if missing
        if (!updatedItem.markerEnd) {
          updatedItem.markerEnd = {
            type: 'arrow',
            color: '#94a3b8',
          };
        }

        return {
          ...change,
          item: updatedItem
        };
      }
      return change;
    });

    // Apply the processed changes
    onEdgesChange(processedChanges);
  }, [onEdgesChange]);

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
    })
  );

  // Drag and drop handlers for React Flow
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
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
    const { label, description } = getNodeLabelAndDescription(nodeType as NodeType);

    // Create new node
    const newNode: CustomNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType as NodeType,
      position,
      data: {
        label,
        description,
        status: "initial",
        config: {}
      },
    };

    // Add the new node to the flow
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragType(active.data.current?.type as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);
    // setDragPreviewPosition(null);

    // Check if we're dropping on the flow area
    if (over?.id === 'flow-canvas' && reactFlowInstance) {
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.activatorEvent.clientX,
        y: event.activatorEvent.clientY,
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
            status: "initial",
            config: {}
          },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    }
  };

  const onAddNodeToEdge = useCallback((edgeId: string, nodeType: string) => {
    console.log("onAddNodeToEdge called with edgeId:", edgeId, "nodeType:", nodeType);
    // Get current edges from React Flow instance
    const currentEdges = reactFlowInstance?.getEdges() || [];
    const edge = currentEdges.find(e => e.id === edgeId);
    if (!edge) {
      console.log("Edge not found:", edgeId);
      console.log("Current edges:", currentEdges);
      return;
    }

    // Get fixed label and description for the node type
    const { label, description } = getNodeLabelAndDescription(nodeType as NodeType);

    // Create new node
    const newNodeId = `${nodeType}-${Date.now()}`;
    const newNode: CustomNode = {
      id: newNodeId,
      type: nodeType as NodeType,
      position: { x: 0, y: 0 }, // Will be positioned by auto-layout
      data: {
        label,
        description,
        status: "initial",
        config: {} // Initialize empty config object
      },
    };

    // Create new edges
    const newEdge1: Edge<CustomEdgeData> = {
      id: `e-${edge.source}-${newNodeId}`,
      source: edge.source,
      target: newNodeId,
      type: 'default',
      data: { onAddNode: onAddNodeToEdge },
      markerEnd: {
        type: 'arrow',
        color: '#94a3b8',
      },
    };

    const newEdge2: Edge<CustomEdgeData> = {
      id: `e-${newNodeId}-${edge.target}`,
      source: newNodeId,
      target: edge.target,
      type: 'default',
      data: { onAddNode: onAddNodeToEdge },
      markerEnd: {
        type: 'arrow',
        color: '#94a3b8',
      },
    };

    // Update state
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => {
      const updatedEdges = eds.filter(e => e.id !== edgeId);
      return [...updatedEdges, newEdge1, newEdge2];
    });
  }, [reactFlowInstance, setNodes, setEdges]);

  const onAddNode = useCallback((type: NodeType) => {
    if (!reactFlowInstance) return;

    const { label, description } = getNodeLabelAndDescription(type);

    const newNode: CustomNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label,
        description,
        status: "initial",
        config: {} // Initialize empty config object
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, reactFlowInstance]);

  const onUpdateNode = useCallback((id: string, data: BaseNodeData) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === id ? { ...node, data } : node))
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge<CustomEdgeData> = {
        ...params,
        type: 'default',
        data: { onAddNode: onAddNodeToEdge },
        markerEnd: {
          type: 'arrow',
          color: '#94a3b8',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, onAddNodeToEdge]
  );

  // Generate preview action from nodes and edges
  const generatePreviewAction = useCallback(() => {
    try {
      // This is a simplified version - in a real implementation, 
      // we would traverse the graph to build the action
      const action: Partial<DataMatrixAction> = {
        version: "1.0",
      };

      // Find the first wifiConnect node and use its config
      const wifiNode = nodes.find(node => node.type === "wifiConnect");
      if (wifiNode?.data.config) {
        action.action = "wifi_connect";
        action.wifi = {
          ssid: (wifiNode.data.config.ssid as string) || "",
          password: (wifiNode.data.config.password as string) || "",
          security: (wifiNode.data.config.security as string) || "WPA2",
        };
      }

      // Find the first notification node and use its config for post_connect
      const notificationNode = nodes.find(node => node.type === "notification");
      if (notificationNode?.data.config) {
        action.post_connect = {
          notification: {
            title: (notificationNode.data.config.title as string) || "",
            message: (notificationNode.data.config.message as string) || "",
          }
        };
      }

      // Validate the action
      const validatedAction = dataMatrixActionSchema.parse(action);
      setPreviewAction(validatedAction);
      setIsPreviewValid(true);
      return validatedAction;
    } catch (error) {
      console.error("Validation error:", error);
      setIsPreviewValid(false);
      toast.error("Invalid action configuration");
      return null;
    }
  }, [nodes]);

  // Generate preview when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      generatePreviewAction();
    } else {
      setPreviewAction(null);
    }
  }, [nodes, generatePreviewAction]);

  // Export functionality to generate DataMatrixAction object
  const exportFlow = useCallback(() => {
    const action = generatePreviewAction();
    if (action && isPreviewValid) {
      // In a real implementation, this would download the action as JSON
      const dataStr = JSON.stringify(action, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

      const exportFileDefaultName = 'datamatrix-flow.json';

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast.success("Flow exported successfully");
    } else {
      toast.error("Cannot export invalid flow");
    }
  }, [generatePreviewAction, isPreviewValid]);

  // Import functionality to load DataMatrixAction object
  const importFlow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        // In a real implementation, this would parse the flow and set nodes/edges
        toast.success("Flow imported successfully");
      } catch (error) {
        toast.error("Failed to import flow");
      }
    };
    reader.readAsText(file);
  }, []);

  // Auto-layout functionality
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Workflow runner functionality
  const [isRunning, setIsRunning] = useState(false);
  const [runnerStatus, setRunnerStatus] = useState<NodeStatus>("initial");

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    setRunnerStatus("loading");

    // Find the runner node if it exists
    const runnerNode = nodes.find(node => node.type === "runner");

    try {
      // Simulate workflow execution
      // In a real implementation, this would execute the actual workflow
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update runner node status if it exists
      if (runnerNode) {
        setNodes(nds =>
          nds.map(node =>
            node.id === runnerNode.id
              ? { ...node, data: { ...node.data, status: "success" } }
              : node
          )
        );
      }

      setRunnerStatus("success");
      toast.success("Workflow executed successfully");
    } catch (error) {
      // Update runner node status if it exists
      if (runnerNode) {
        setNodes(nds =>
          nds.map(node =>
            node.id === runnerNode.id
              ? { ...node, data: { ...node.data, status: "error" } }
              : node
          )
        );
      }

      setRunnerStatus("error");
      toast.error("Failed to execute workflow");
      console.error("Workflow execution error:", error);
    } finally {
      setIsRunning(false);
    }
  }, [nodes, setNodes]);

  // Helper function to render node preview for drag overlay
  const renderNodePreview = (type: NodeType) => {
    const { label, description } = getNodeLabelAndDescription(type);

    // Get the appropriate node component based on type
    switch (type) {
      case "wifiConnect":
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
    setIsLocked(prev => !prev);
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
    <>
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
            onDragEnd={onDragEnd}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={isLocked ? undefined : onNodesChange}
              onEdgesChange={isLocked ? undefined : customOnEdgesChange}
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
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#94a3b8" />
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
                            role="img" aria-label="Auto Layout"
                            xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
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
                          onClick={() => document.getElementById('import-flow')?.click()}
                        >
                          <Upload className="h-4 w-4" />
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
                          variant={isLocked ? "default" : "outline"}
                          size="icon"
                          className="rounded-none border-0 border-b last:border-b-0"
                          onClick={() => {
                            setSelectedNodeId(null)
                            setIsDrawerOpen(true)
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
                          variant={isLocked ? "default" : "outline"}
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
            <DragOverlay>
              {activeDragType && (
                <div className="opacity-80 pointer-events-none">
                  {renderNodePreview(activeDragType as NodeType)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Drawer for node configuration */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
          <DrawerContent className="max-w-[100vw] sm:max-w-sm ml-auto">
            <DrawerHeader className="flex items-center justify-between">
              <DrawerTitle>
                {selectedNode ? selectedNode.data.label : "Configuration"}
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
                <PreviewPanel action={previewAction} />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

// Main component wrapper
export function VisualFlowBuilder() {
  return (
    <div className="w-full">
      <ReactFlowProvider>
        <FlowBuilder />
      </ReactFlowProvider>
    </div>
  );
}