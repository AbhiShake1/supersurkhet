import React from "react";
import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  EdgeProps,
  getBezierPath,
  useReactFlow
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Info, Play, Square, Globe } from "lucide-react";
import {
  Wifi,
  User,
  Settings,
  ShoppingCart,
  Database,
  Navigation,
  Bell,
  GripVertical,
  Repeat,
} from "lucide-react";

// Define node types with icons and colors
const nodeTypes = [
  { type: "start", label: "Start", icon: Play, color: "bg-green-500" },
  { type: "end", label: "End", icon: Square, color: "bg-red-500" },
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
  { type: "runner", label: "Workflow Runner", icon: Play, color: "bg-violet-500" },
];

export type CustomEdgeData = {
  onAddNode?: (edgeId: string, nodeType: string) => void;
  isAddButtonHidden?: boolean;
  label?: string;
  description?: string;
};

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const { fitView } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onAddNode = (nodeType: string) => {
    console.log("Adding node of type:", nodeType, "to edge:", id);
    if (data?.onAddNode) {
      data.onAddNode(id, nodeType);
    } else {
      console.log("No onAddNode function found in edge data");
    }
  };

  if (data?.isAddButtonHidden) {
    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} />
      </>
    );
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="w-6 h-6 rounded-full shadow-lg"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Node Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {nodeTypes.map((nodeType) => {
                    const Icon = nodeType.icon;
                    return (
                      <DropdownMenuItem 
                        key={nodeType.type} 
                        onSelect={() => onAddNode(nodeType.type)}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${nodeType.color}`} />
                        <Icon className="w-4 h-4" />
                        <span>{nodeType.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {data?.label && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-6 h-6 rounded-full shadow-lg"
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">{data.label}</h4>
                    {data.description && (
                      <p className="text-sm text-muted-foreground">{data.description}</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}