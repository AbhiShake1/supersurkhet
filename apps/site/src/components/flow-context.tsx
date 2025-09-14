import { createContext, useContext, useCallback } from "react";
import { useNodesState, useEdgesState, useReactFlow } from "@xyflow/react";
import type { CustomNode, NodeType } from "@/components/qr/visual-flow-builder";
import type { Edge } from "@xyflow/react";
import { addEdge } from "@xyflow/react";
import { getNodeLabelAndDescription } from "@/components/qr/visual-flow-builder";

interface FlowContextType {
  nodes: CustomNode[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  setNodes: (nodes: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onAddNode: (type: NodeType) => void;
  onAddNodeAtHandle: (
    nodeId: string,
    handleId: string,
    handleType: "target" | "source",
    nodeType: NodeType
  ) => void;
  onAddNodeToEdge: (edgeId: string, nodeType: string) => void;
  onConnect: (params: any) => void;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useReactFlow();

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
        config: {}
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes, reactFlowInstance]);

  const onAddNodeAtHandle = useCallback((
    nodeId: string,
    handleId: string,
    handleType: "target" | "source",
    nodeType: NodeType
  ) => {
    if (!reactFlowInstance) return;

    // Get fixed label and description for the new node
    const { label, description } = getNodeLabelAndDescription(nodeType);

    // Create new node
    const newNodeId = `${nodeType}-${Date.now()}`;
    const newNode: CustomNode = {
      id: newNodeId,
      type: nodeType,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: {
        label,
        description,
        status: "initial",
        config: {}
      },
    };

    // Create new edge based on handle type
    let newEdge: Edge;
    if (handleType === "source") {
      // Connect from current node to new node
      newEdge = {
        id: `e-${nodeId}-${newNodeId}`,
        source: nodeId,
        target: newNodeId,
        type: 'default',
        data: { onAddNode: onAddNodeToEdge },
        markerEnd: {
          type: 'arrow',
          color: '#94a3b8',
        },
      };
    } else {
      // Connect from new node to current node
      newEdge = {
        id: `e-${newNodeId}-${nodeId}`,
        source: newNodeId,
        target: nodeId,
        type: 'default',
        data: { onAddNode: onAddNodeToEdge },
        markerEnd: {
          type: 'arrow',
          color: '#94a3b8',
        },
      };
    }

    // Update state
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  }, [reactFlowInstance, setNodes, setEdges]);

  const onAddNodeToEdge = useCallback((edgeId: string, nodeType: string) => {
    // Get current edges from React Flow instance
    const currentEdges = reactFlowInstance?.getEdges() || [];
    const edge = currentEdges.find(e => e.id === edgeId);
    if (!edge) {
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
        config: {}
      },
    };

    // Create new edges
    const newEdge1: Edge = {
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

    const newEdge2: Edge = {
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

  const onConnect = useCallback(
    (params: any) => {
      const newEdge: Edge = {
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

  return (
    <FlowContext.Provider
      value={{
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setNodes,
        setEdges,
        onAddNode,
        onAddNodeAtHandle,
        onAddNodeToEdge,
        onConnect
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error("useFlow must be used within a FlowProvider");
  }
  return context;
}