import { useState } from "react";
import { Position, type HandleProps } from "@xyflow/react";
import { ButtonHandle } from "@/components/button-handle";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NodeType } from "@/components/qr/visual-flow-builder";

// Define node types with all properties including icon
const nodeTypesDefinition = [
  { type: "wifiConnect", label: "WiFi Connection", icon: "Wifi", color: "bg-blue-500/20 dark:bg-blue-600/20" },
  { type: "profileEnrichment", label: "Profile Enrichment", icon: "User", color: "bg-purple-500/20 dark:bg-purple-600/20" },
  { type: "equipmentSession", label: "Equipment Session", icon: "Settings", color: "bg-orange-500/20 dark:bg-orange-600/20" },
  { type: "restaurantOrdering", label: "Restaurant Ordering", icon: "ShoppingCart", color: "bg-amber-500/20 dark:bg-amber-600/20" },
  { type: "productInteraction", label: "Product Interaction", icon: "Database", color: "bg-teal-500/20 dark:bg-teal-600/20" },
  { type: "navigate", label: "Navigation", icon: "Navigation", color: "bg-cyan-500/20 dark:bg-cyan-600/20" },
  { type: "notification", label: "Notification", icon: "Bell", color: "bg-pink-500/20 dark:bg-pink-600/20" },
  { type: "condition", label: "Condition", icon: "GripVertical", color: "bg-yellow-500/20 dark:bg-yellow-600/20" },
  { type: "loop", label: "Loop", icon: "Repeat", color: "bg-indigo-500/20 dark:bg-indigo-600/20" },
  { type: "apiCall", label: "API Call", icon: "Globe", color: "bg-emerald-500/20 dark:bg-emerald-600/20" },
  { type: "runner", label: "Workflow Runner", icon: "Play", color: "bg-violet-500/20 dark:bg-violet-600/20" },
  // Custom flow nodes with special shapes
  { type: "input", label: "Input", icon: "ArrowRight", color: "bg-blue-500/20 dark:bg-blue-600/20" },
  { type: "output", label: "Output", icon: "ArrowRight", color: "bg-blue-500/20 dark:bg-blue-600/20" },
  { type: "process", label: "Process", icon: "Square", color: "bg-purple-500/20 dark:bg-purple-600/20" },
  { type: "predefined", label: "Predefined Process", icon: "Square", color: "bg-indigo-500/20 dark:bg-indigo-600/20" },
  { type: "document", label: "Document", icon: "FileText", color: "bg-amber-500/20 dark:bg-amber-600/20" },
];

// Map string icon names to actual components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wifi: () => <svg
    role="img" aria-label="WiFi Connection"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" /><path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" /></svg>,
  User: () => <svg
    role="img" aria-label="User Profile"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Settings: () => <svg
    role="img" aria-label="Settings"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
  ShoppingCart: () => <svg
    role="img" aria-label="Shopping Cart"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>,
  Database: () => <svg
    role="img" aria-label="Database"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  Navigation: () => <svg
    role="img" aria-label="Navigation"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>,
  Bell: () => <svg
    role="img" aria-label="Notification"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  GripVertical: () => <svg
    role="img" aria-label="Vertical Grip"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>,
  Repeat: () => <svg
    role="img" aria-label="Repeat"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
  Globe: () => <svg
    role="img" aria-label="Globe"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>,
  Play: () => <svg
    role="img" aria-label="Play"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  Circle: () => <svg
    role="img" aria-label="Circle"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /></svg>,
  ArrowRight: () => <svg
    role="img" aria-label="Arrow Right"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
  Square: () => <svg
    role="img" aria-label="Square"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>,
  FileText: () => <svg
    role="img" aria-label="File Text"
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>,
};

export const NodeButtonHandle = ({
  showButton = true,
  position = Position.Bottom,
  nodeId,
  handleId,
  handleType,
  onAddNode,
  children,
  ...props
}: HandleProps & {
  showButton?: boolean;
  nodeId: string;
  handleId: string;
  handleType: "target" | "source";
  onAddNode: (nodeId: string, handleId: string, handleType: "target" | "source", nodeType: NodeType) => void;
}) => {
  return (
    <ButtonHandle position={position} id={props.id} {...props}>
      {showButton && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Add Node</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {nodeTypesDefinition.map((nodeType) => {
                const Icon = iconMap[nodeType.icon] || (() => <div className="w-4 h-4" />);
                return (
                  <DropdownMenuItem
                    key={nodeType.type}
                    onSelect={(e) => {
                      e.stopPropagation();
                      onAddNode(nodeId, handleId, handleType, nodeType.type as NodeType);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${nodeType.color}`} />
                    <Icon />
                    <span>{nodeType.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ButtonHandle>
  );
};