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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Code,
  Database,
  Download,
  Eye,
  Globe,
  GripVertical,
  Navigation,
  Palette,
  Play,
  Printer,
  Repeat,
  Settings,
  Share2,
  ShoppingCart,
  Square,
  Trash,
  Upload,
  User,
  Wifi,
  X
} from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { DataMatrixCode } from "@/components/ui/datamatrix-code";
import { type DataMatrixAction, dataMatrixActionSchema } from "@/lib/datamatrix";
import { toast } from "sonner";

import { AnimatedSvgEdge } from "@/components/animated-svg-edge";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { ButtonEdge } from "@/components/button-edge";
import { DataEdge } from "@/components/data-edge";
import { type NodeStatus, NodeStatusIndicator } from "@/components/node-status-indicator";
import { ZoomSlider } from "@/components/zoom-slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BaseHandle } from "../base-handle";

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
  | "start"
  | "end"
  | "custom";

type BaseNodeData = {
  label: string;
  description?: string;
  status?: NodeStatus;
  config?: Record<string, unknown>;
}

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

// Custom Node Components using our base components
const StartNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-32 bg-green-500/20 dark:bg-green-600/20 backdrop-blur-sm border border-green-500/30 dark:border-green-600/30 text-green-900 dark:text-green-100 shadow-sm">
        <BaseNodeHeader className="text-green-900 dark:text-green-100">
          <BaseNodeHeaderTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
            <Play className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-green-900 dark:text-green-100">
          {data.description && <div>{data.description}</div>}
        </BaseNodeContent>
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="start-output"
          className="bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-700 h-24 w-24"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

const EndNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-32 bg-red-500/20 dark:bg-red-600/20 backdrop-blur-sm border border-red-500/30 dark:border-red-600/30 text-red-900 dark:text-red-100 shadow-sm">
        <BaseNodeHeader className="text-red-900 dark:text-red-100">
          <BaseNodeHeaderTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
            <Square className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-red-900 dark:text-red-100">
          {data.description && <div>{data.description}</div>}
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="end-input"
          className="bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

const WifiConnectNode = ({ data, id }: NodeProps) => {
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

const ProfileEnrichmentNode = ({ data, id }: NodeProps) => {
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

const EquipmentSessionNode = ({ data, id }: NodeProps) => {
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

const RestaurantOrderingNode = ({ data, id }: NodeProps) => {
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

const ProductInteractionNode = ({ data, id }: NodeProps) => {
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

const NavigateNode = ({ data, id }: NodeProps) => {
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

const NotificationNode = ({ data, id }: NodeProps) => {
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

const ConditionNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-yellow-500/20 dark:bg-yellow-600/20 backdrop-blur-sm border border-yellow-500/30 dark:border-yellow-600/30 text-yellow-900 dark:text-yellow-100 shadow-sm">
        <BaseNodeHeader className="text-yellow-900 dark:text-yellow-100">
          <BaseNodeHeaderTitle className="text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
            <GripVertical className="h-4 w-4" />
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-yellow-900 dark:text-yellow-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Condition:</span>
              <span className="font-mono truncate max-w-[100px]">{data.config?.condition || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="condition-input"
          className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
        />
        <div className="flex justify-between px-2 pb-2">
          <div className="flex flex-col items-center">
            <span className="text-xs text-yellow-900 dark:text-yellow-100">
              {data.config?.truePath || "True"}
            </span>
            <BaseHandle
              type="source"
              position={Position.Bottom}
              id="true-output"
              className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-yellow-900 dark:text-yellow-100">
              {data.config?.falsePath || "False"}
            </span>
            <BaseHandle
              type="source"
              position={Position.Bottom}
              id="false-output"
              className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
            />
          </div>
        </div>
      </BaseNode>
    </NodeStatusIndicator>
  );
};

const LoopNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-indigo-500/20 dark:bg-indigo-600/20 backdrop-blur-sm border border-indigo-500/30 dark:border-indigo-600/30 text-indigo-900 dark:text-indigo-100 shadow-sm">
        <BaseNodeHeader className="text-indigo-900 dark:text-indigo-100">
          <BaseNodeHeaderTitle className="text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M12 3v18" />
            </svg>
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-indigo-900 dark:text-indigo-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Iterations:</span>
              <span>{data.config?.iterations || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="loop-input"
          className="bg-indigo-500 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-700"
        />
        <div className="flex justify-between px-2 pb-2">
          <div className="flex flex-col items-center">
            <span className="text-xs text-indigo-900 dark:text-indigo-100">Body</span>
            <BaseHandle
              type="source"
              position={Position.Bottom}
              id="body-output"
              className="bg-indigo-500 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-700"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-indigo-900 dark:text-indigo-100">Done</span>
            <BaseHandle
              type="source"
              position={Position.Right}
              id="done-output"
              className="bg-indigo-500 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-700"
            />
          </div>
        </div>
      </BaseNode>
    </NodeStatusIndicator>
  );
};

const APICallNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-emerald-500/20 dark:bg-emerald-600/20 backdrop-blur-sm border border-emerald-500/30 dark:border-emerald-600/30 text-emerald-900 dark:text-emerald-100 shadow-sm">
        <BaseNodeHeader className="text-emerald-900 dark:text-emerald-100">
          <BaseNodeHeaderTitle className="text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m7 11 2-2-2-2" />
              <path d="M11 13h4" />
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            </svg>
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-emerald-900 dark:text-emerald-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Method:</span>
              <span>{data.config?.method || "GET"}</span>
            </div>
            <div className="flex justify-between">
              <span>URL:</span>
              <span className="font-mono truncate max-w-[100px]">{data.config?.url || "Not set"}</span>
            </div>
          </div>
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

// Node type configuration
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  wifiConnect: WifiConnectNode,
  profileEnrichment: ProfileEnrichmentNode,
  equipmentSession: EquipmentSessionNode,
  restaurantOrdering: RestaurantOrderingNode,
  productInteraction: ProductInteractionNode,
  navigate: NavigateNode,
  notification: NotificationNode,
  condition: ConditionNode,
  loop: LoopNode,
  apiCall: APICallNode,
};

// Edge type configuration
const edgeTypes: EdgeTypes = {
  default: ButtonEdge,
  data: DataEdge,
  animated: AnimatedSvgEdge,
};

// Sidebar component for node library
const NodeLibrary = ({ onAddNode }: { onAddNode: (type: NodeType) => void }) => {
  const nodeTypes = [
    { type: "wifiConnect", label: "WiFi Connection", icon: Wifi, color: "bg-blue-500" },
    { type: "profileEnrichment", label: "Profile Enrichment", icon: User, color: "bg-purple-500" },
    { type: "equipmentSession", label: "Equipment Session", icon: Settings, color: "bg-orange-500" },
    { type: "restaurantOrdering", label: "Restaurant Ordering", icon: ShoppingCart, color: "bg-amber-500" },
    { type: "productInteraction", label: "Product Interaction", icon: Database, color: "bg-teal-500" },
    { type: "navigate", label: "Navigation", icon: Navigation, color: "bg-cyan-500" },
    { type: "notification", label: "Notification", icon: Bell, color: "bg-pink-500" },
    { type: "condition", label: "Condition", icon: GripVertical, color: "bg-yellow-500" },
    { type: "loop", label: "Loop", icon: Repeat, color: "bg-indigo-500" },
    { type: "apiCall", label: "API Call", icon: Globe, color: "bg-emerald-500" },
  ];

  return (
    <Card className="w-64 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Node Library
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <Button
                key={nodeType.type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddNode(nodeType.type as NodeType)}
              >
                <div className={`w-3 h-3 rounded-full ${nodeType.color} mr-2`} />
                <Icon className="h-4 w-4 mr-2" />
                {nodeType.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Configuration panel for selected nodes
const NodeConfigPanel = ({
  selectedNode,
  onUpdateNode
}: {
  selectedNode: CustomNode | null;
  onUpdateNode: (id: string, data: BaseNodeData) => void;
}) => {
  if (!selectedNode) {
    return (
      <Card className="w-80 h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Select a node to configure its properties
          </p>
        </CardContent>
      </Card>
    );
  }

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

  const renderConfigFields = () => {
    switch (selectedNode.type) {
      case "wifiConnect":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ssid">WiFi Network Name (SSID)</Label>
              <Input
                id="ssid"
                value={(selectedNode.data.config?.ssid as string) || ""}
                onChange={(e) => handleConfigChange("ssid", e.target.value)}
                placeholder="Enter network name"
              />
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
                  <SelectItem value="WPA2">WPA2</SelectItem>
                  <SelectItem value="WPA3">WPA3</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="open">Open Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

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

  return (
    <Card className="w-80 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {selectedNode.type.replace(/([A-Z])/g, ' $1').trim()} Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Node Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => onUpdateNode(selectedNode.id, {
                ...selectedNode.data,
                label: e.target.value
              })}
              placeholder="Enter node label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={selectedNode.data.description || ""}
              onChange={(e) => onUpdateNode(selectedNode.id, {
                ...selectedNode.data,
                description: e.target.value
              })}
              placeholder="Enter node description"
              rows={2}
            />
          </div>
          {renderConfigFields()}
        </div>
      </CardContent>
    </Card>
  );
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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<CustomNode | null>(null);
  const [previewAction, setPreviewAction] = useState<DataMatrixAction | null>(null);
  const [isPreviewValid, setIsPreviewValid] = useState(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onAddNode = useCallback((type: NodeType) => {
    if (!reactFlowInstance) return;

    const newNode: CustomNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label: type.replace(/([A-Z])/g, ' $1').trim(),
        description: `Configure this ${type.replace(/([A-Z])/g, ' $1').trim()} node`,
        status: "initial"
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, reactFlowInstance]);

  const onUpdateNode = useCallback((id: string, data: BaseNodeData) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === id ? { ...node, data } : node))
    );
  }, [setNodes]);

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

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

  // Import functionality
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

  return (
    <div className="w-full h-[700px] flex border rounded-lg overflow-hidden bg-background [&_.react-flow__attribution]:hidden">
      {/* Left sidebar - Node library */}
      <div className="w-64 border-r bg-background">
        <NodeLibrary onAddNode={onAddNode} />
      </div>

      {/* Main flow area */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node as CustomNode)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="react-flow-theme-dark bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#94a3b8" />
          <ZoomSlider />
          <Panel position="top-right" className="flex gap-2">
            <TooltipProvider>
              <div className="flex rounded-md border overflow-hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-r last:border-r-0"
                      onClick={exportFlow}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export Flow</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-r last:border-r-0"
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
                  <TooltipContent>
                    <p>Import Flow</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-none border-0 border-r last:border-r-0"
                      onClick={() => {
                        setNodes([]);
                        setEdges([]);
                        setSelectedNode(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear Canvas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar - Configuration and preview */}
      <div className="w-80 border-l flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto p-4">
          {selectedNode ? (
            <NodeConfigPanel
              selectedNode={selectedNode}
              onUpdateNode={onUpdateNode}
            />
          ) : (
            <PreviewPanel action={previewAction} />
          )}
        </div>
        <div className="p-4 border-t flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant={isPreviewValid ? "default" : "destructive"}>
              {isPreviewValid ? "Valid" : "Invalid"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportFlow}
            >
              <Code className="h-4 w-4 mr-2" />
              Export Flow
            </Button>
          </div>
        </div>
      </div>
    </div>
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