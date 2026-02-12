import { useState, useMemo } from 'react';
import { Position, type HandleProps } from '@xyflow/react';
import { ButtonHandle } from '@/components/button-handle';
import { BaseHandle } from '@/components/base-handle';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { NodeType } from '@/components/qr/visual-flow-builder';
import { useFlow } from '@/components/flow-context';
import { cn } from '@/lib/utils';

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
  handleType: 'target' | 'source';
  onAddNode: (
    nodeId: string,
    handleId: string,
    handleType: 'target' | 'source',
    nodeType: NodeType,
  ) => void;
}) => {
  const {
    nodeLibraryOrder,
    isDraggingNode,
    activeDragType,
    isHandleConnected,
  } = useFlow();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Check if this handle is already connected to another node
  const isConnected = useMemo(() => {
    return isHandleConnected(nodeId, handleId, handleType);
  }, [isHandleConnected, nodeId, handleId, handleType]);

  // Create icon map with actual components
  const iconComponents = {
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Wifi: () => (
      <svg
        role="img"
        aria-label="WiFi Connection"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.859a10 10 0 0 1 14 0" />
        <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    User: () => (
      <svg
        role="img"
        aria-label="User Profile"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Settings: () => (
      <svg
        role="img"
        aria-label="Settings"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    ShoppingCart: () => (
      <svg
        role="img"
        aria-label="Shopping Cart"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Database: () => (
      <svg
        role="img"
        aria-label="Database"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Navigation: () => (
      <svg
        role="img"
        aria-label="Navigation"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Bell: () => (
      <svg
        role="img"
        aria-label="Notification"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    GripVertical: () => (
      <svg
        role="img"
        aria-label="Vertical Grip"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="19" r="1" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Repeat: () => (
      <svg
        role="img"
        aria-label="Repeat"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="m7 22-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Globe: () => (
      <svg
        role="img"
        aria-label="Globe"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Play: () => (
      <svg
        role="img"
        aria-label="Play"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Circle: () => (
      <svg
        role="img"
        aria-label="Circle"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    ArrowRight: () => (
      <svg
        role="img"
        aria-label="Arrow Right"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    Square: () => (
      <svg
        role="img"
        aria-label="Square"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
      </svg>
    ),
    // biome-ignore lint/correctness/noNestedComponentDefinitions: lint debt cleanup
    FileText: () => (
      <svg
        role="img"
        aria-label="File Text"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
  };

  // Filter node types based on search term and use order from context
  const filteredNodeTypes = useMemo(() => {
    if (!search) return nodeLibraryOrder;
    return nodeLibraryOrder.filter(
      (nodeType) =>
        nodeType.label.toLowerCase().includes(search.toLowerCase()) ||
        nodeType.type.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, nodeLibraryOrder]);

  // Handle drop on placeholder
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    // Get the node type from dataTransfer
    const nodeType = event.dataTransfer.getData('application/reactflow');

    // Check if the dropped element is valid
    if (nodeType) {
      onAddNode(nodeId, handleId, handleType, nodeType as NodeType);
    }
  };

  // Handle drag over
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = (event: React.DragEvent) => {
    // Only set to false if we're actually leaving, not moving between child elements
    if (event.currentTarget === event.target) {
      setIsDragOver(false);
    }
  };

  // Show placeholder when dragging a compatible node
  const showPlaceholder = isDraggingNode && activeDragType;

  if (isConnected) {
    // If the handle is connected, render a BaseHandle without the button functionality
    return (
      <BaseHandle
        position={position}
        id={props.id}
        {...props}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {children}
      </BaseHandle>
    );
  }

  // If not connected, render the full ButtonHandle functionality
  return (
    <ButtonHandle
      position={position}
      id={props.id}
      {...props}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {showButton &&
        !isConnected &&
        (showPlaceholder ? (
          <div
            className={cn(
              'w-6 h-6 rounded-full bg-blue-500/20 dark:bg-blue-600/20 border border-blue-500/30 dark:border-blue-600/30 flex items-center justify-center cursor-pointer hover:bg-blue-500/30 dark:hover:bg-blue-600/30 transition-colors',
              isDragOver && 'ring-2 ring-accent border-accent',
            )}
          >
            <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400"></div>
          </div>
        ) : (
          <DropdownMenu open={open} onOpenChange={setOpen}>
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
            <DropdownMenuContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Search node types..."
                  value={search}
                  onValueChange={setSearch}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No node types found.</CommandEmpty>
                  <CommandGroup>
                    {filteredNodeTypes.map((nodeType) => {
                      const Icon =
                        iconComponents[
                          nodeType.type as keyof typeof iconComponents
                        ] || (() => <div className="w-4 h-4" />);
                      return (
                        <CommandItem
                          key={nodeType.type}
                          value={nodeType.label}
                          onSelect={() => {
                            onAddNode(
                              nodeId,
                              handleId,
                              handleType,
                              nodeType.type as NodeType,
                            );
                            setOpen(false);
                            setSearch('');
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${nodeType.color}`}
                          />
                          <Icon />
                          <span>{nodeType.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
    </ButtonHandle>
  );
};
