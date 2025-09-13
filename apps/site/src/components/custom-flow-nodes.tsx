"use client";

import { BaseHandle } from "@/components/base-handle";
import { BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle } from "@/components/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type NodeProps, Position } from "@xyflow/react";
import { Trash } from "lucide-react";

// Delete button component for nodes
function DeleteNodeButton({ id }: { id: string }) {
  // Note: In a real implementation, you would use useReactFlow() hook to delete the node
  // For this example, we'll just provide the UI component
  const handleDelete = () => {
    // This would typically use the useReactFlow hook:
    // const { setNodes } = useReactFlow();
    // setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
    console.log(`Delete node with id: ${id}`);
  };

  return (
    <TooltipProvider>
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
  );
}

// Diamond-shaped node for conditions
export const ConditionNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <div className="relative" style={{ width: 120, height: 120 }}>
        {/* Diamond background using a rotated square */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 80,
            height: 80,
            backgroundColor: 'rgba(234, 179, 8, 0.2)', // yellow-500 with opacity
            border: '1px solid rgba(234, 179, 8, 0.3)',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            borderRadius: 4,
          }}
        />
        
        {/* Content (not rotated) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            padding: 10,
          }}
          className="text-yellow-900 dark:text-yellow-100"
        >
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.label}</div>
          {data.description && (
            <div style={{ fontSize: 12, marginTop: 4 }}>{data.description}</div>
          )}
        </div>
        
        {/* Handles */}
        <BaseHandle
          type="target"
          position={Position.Top}
          id="condition-input"
          className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
          style={{
            top: 4,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <BaseHandle
          type="source"
          position={Position.Left}
          id="false-output"
          className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
          style={{
            left: 4,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
        <BaseHandle
          type="source"
          position={Position.Right}
          id="true-output"
          className="bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700"
          style={{
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        />
      </div>
    </NodeStatusIndicator>
  );
};

// Circular node for start/end
export const StartEndNode = ({ data, id }: NodeProps) => {
  const isStart = data.type === "start";
  const bgColor = isStart
    ? "bg-green-500/20 dark:bg-green-600/20"
    : "bg-red-500/20 dark:bg-red-600/20";
  const borderColor = isStart
    ? "border-green-500/30 dark:border-green-600/30"
    : "border-red-500/30 dark:border-red-600/30";
  const handleColor = isStart
    ? "bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-700"
    : "bg-red-500 dark:bg-red-600 border-red-600 dark:border-red-700";

  return (
    <NodeStatusIndicator status={data.status}>
      <div
        className={`rounded-full ${bgColor} ${borderColor} backdrop-blur-sm text-center shadow-sm flex flex-col items-center justify-center relative`}
        style={{
          width: 100,
          height: 100,
        }}
      >
        <div className="font-semibold px-2">{data.label}</div>
        {data.description && (
          <div className="text-xs px-2 mt-1">{data.description}</div>
        )}
        {isStart ? (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
            <BaseHandle
              type="source"
              position={Position.Bottom}
              id="start-output"
              className={handleColor}
            />
          </div>
        ) : (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <BaseHandle
              type="target"
              position={Position.Top}
              id="end-input"
              className={handleColor}
            />
          </div>
        )}
      </div>
    </NodeStatusIndicator>
  );
};

// Parallelogram node for input/output
export const IO_Node = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <div
        className="bg-blue-500/20 dark:bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 dark:border-blue-600/30 text-blue-900 dark:text-blue-100 shadow-sm relative"
        style={{
          width: 160,
          height: 80,
          transform: "skewX(-20deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="flex flex-col items-center justify-center w-full h-full"
          style={{ transform: "skewX(20deg)" }}
        >
          <div className="font-semibold text-center px-4">{data.label}</div>
          {data.description && (
            <div className="text-xs text-center px-4 mt-1">{data.description}</div>
          )}
        </div>
        <div className="absolute -top-3 left-1/3 transform -translate-x-1/2">
          <BaseHandle
            type="target"
            position={Position.Top}
            id="io-input"
            className="bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700"
          />
        </div>
        <div className="absolute -bottom-3 right-1/3 transform translate-x-1/2">
          <BaseHandle
            type="source"
            position={Position.Bottom}
            id="io-output"
            className="bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-700"
          />
        </div>
      </div>
    </NodeStatusIndicator>
  );
};

// Rectangle node for process
export const ProcessNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <BaseNode className="w-48 bg-purple-500/20 dark:bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 dark:border-purple-600/30 text-purple-900 dark:text-purple-100 shadow-sm">
        <BaseNodeHeader className="text-purple-900 dark:text-purple-100">
          <BaseNodeHeaderTitle className="text-purple-900 dark:text-purple-100">
            {data.label}
          </BaseNodeHeaderTitle>
          <DeleteNodeButton id={id} />
        </BaseNodeHeader>
        <BaseNodeContent className="p-2 text-xs text-purple-900 dark:text-purple-100">
          {data.description && <div className="mb-2">{data.description}</div>}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Action:</span>
              <span className="font-mono">{data.config?.action || "Not set"}</span>
            </div>
          </div>
        </BaseNodeContent>
        <BaseHandle
          type="target"
          position={Position.Top}
          id="process-input"
          className="bg-purple-500 dark:bg-purple-600 border-purple-600 dark:border-purple-700"
        />
        <BaseHandle
          type="source"
          position={Position.Bottom}
          id="process-output"
          className="bg-purple-500 dark:bg-purple-600 border-purple-600 dark:border-purple-700"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
};

// Rounded rectangle node for predefined process
export const PredefinedProcessNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <div
        className="bg-indigo-500/20 dark:bg-indigo-600/20 backdrop-blur-sm border border-indigo-500/30 dark:border-indigo-600/30 text-indigo-900 dark:text-indigo-100 shadow-sm relative rounded-lg"
        style={{
          width: 160,
          height: 80,
          borderLeft: "double 4px",
          borderRight: "double 4px",
          borderColor: "rgb(99 102 241)", // indigo-500
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="font-semibold text-center px-4">{data.label}</div>
          {data.description && (
            <div className="text-xs text-center px-4 mt-1">{data.description}</div>
          )}
        </div>
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="target"
            position={Position.Top}
            id="predefined-input"
            className="bg-indigo-500 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-700"
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="source"
            position={Position.Bottom}
            id="predefined-output"
            className="bg-indigo-500 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-700"
          />
        </div>
      </div>
    </NodeStatusIndicator>
  );
};

// Document node (rectangle with wavy bottom)
export const DocumentNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <div
        className="bg-amber-500/20 dark:bg-amber-600/20 backdrop-blur-sm border border-amber-500/30 dark:border-amber-600/30 text-amber-900 dark:text-amber-100 shadow-sm relative"
        style={{
          width: 140,
          height: 100,
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="font-semibold text-center px-4">{data.label}</div>
          {data.description && (
            <div className="text-xs text-center px-4 mt-1">{data.description}</div>
          )}
        </div>
        {/* Wavy bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4"
          style={{
            background: `repeating-linear-gradient(
              to bottom,
              transparent,
              transparent 2px,
              rgb(202 138 4) 2px,
              rgb(202 138 4) 4px
            )`,
          }}
        />
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="target"
            position={Position.Top}
            id="document-input"
            className="bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700"
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="source"
            position={Position.Bottom}
            id="document-output"
            className="bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-700"
          />
        </div>
      </div>
    </NodeStatusIndicator>
  );
};

// Loop node (hexagon)
export const LoopNode = ({ data, id }: NodeProps) => {
  return (
    <NodeStatusIndicator status={data.status}>
      <div
        className="bg-teal-500/20 dark:bg-teal-600/20 backdrop-blur-sm border border-teal-500/30 dark:border-teal-600/30 text-teal-900 dark:text-teal-100 shadow-sm relative"
        style={{
          width: 140,
          height: 100,
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="font-semibold text-center px-4">{data.label}</div>
          {data.description && (
            <div className="text-xs text-center px-4 mt-1">{data.description}</div>
          )}
        </div>
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="target"
            position={Position.Top}
            id="loop-input"
            className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <BaseHandle
            type="source"
            position={Position.Bottom}
            id="loop-output"
            className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
          />
        </div>
        <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
          <BaseHandle
            type="source"
            position={Position.Right}
            id="loop-back"
            className="bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700"
          />
        </div>
      </div>
    </NodeStatusIndicator>
  );
};

// Export all node types
export const flowNodeTypes = {
  condition: ConditionNode,
  start: StartEndNode,
  end: StartEndNode,
  input: IO_Node,
  output: IO_Node,
  process: ProcessNode,
  predefined: PredefinedProcessNode,
  document: DocumentNode,
  loop: LoopNode,
};