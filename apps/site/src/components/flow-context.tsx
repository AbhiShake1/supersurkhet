import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import type { CustomNode, NodeType } from '@/components/qr/visual-flow-builder';
import type { Edge } from '@xyflow/react';
import { addEdge } from '@xyflow/react';
import { getNodeLabelAndDescription } from '@/components/qr/visual-flow-builder';

// Define node library item type (without icon for serialization)
type NodeLibraryItemType = {
  type: string;
  label: string;
  color: string;
  order?: number;
};

interface FlowContextType {
  nodes: CustomNode[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  setNodes: (
    nodes: CustomNode[] | ((nodes: CustomNode[]) => CustomNode[]),
  ) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onAddNode: (type: NodeType) => void;
  onAddNodeAtHandle: (
    nodeId: string,
    handleId: string,
    handleType: 'target' | 'source',
    nodeType: NodeType,
  ) => void;
  onAddNodeToEdge: (edgeId: string, nodeType: string) => void;
  onConnect: (params: any) => void;
  // Node library order management
  nodeLibraryOrder: NodeLibraryItemType[];
  setNodeLibraryOrder: (order: NodeLibraryItemType[]) => void;
  resetNodeLibraryOrder: () => void;
  // Drag state management
  isDraggingNode: boolean;
  activeDragType: string | null;
  setIsDraggingNode: (isDragging: boolean) => void;
  setActiveDragType: (type: string | null) => void;
  // Handle connection status
  isHandleConnected: (
    nodeId: string,
    handleId: string,
    handleType: 'target' | 'source',
  ) => boolean;
}

const FlowContext = createContext<FlowContextType | undefined>(undefined);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowInstance = useReactFlow();

  // Define default node library order
  const defaultNodeLibraryOrder: NodeLibraryItemType[] = [
    {
      type: 'wifiConnect',
      label: 'WiFi Connection',
      color: 'bg-blue-500/20 dark:bg-blue-600/20',
      order: 2,
    },
    {
      type: 'profileEnrichment',
      label: 'Profile Enrichment',
      color: 'bg-purple-500/20 dark:bg-purple-600/20',
      order: 3,
    },
    {
      type: 'equipmentSession',
      label: 'Equipment Session',
      color: 'bg-orange-500/20 dark:bg-orange-600/20',
      order: 4,
    },
    {
      type: 'restaurantOrdering',
      label: 'Restaurant Ordering',
      color: 'bg-amber-500/20 dark:bg-amber-600/20',
      order: 5,
    },
    {
      type: 'productInteraction',
      label: 'Product Interaction',
      color: 'bg-teal-500/20 dark:bg-teal-600/20',
      order: 6,
    },
    {
      type: 'navigate',
      label: 'Navigation',
      color: 'bg-cyan-500/20 dark:bg-cyan-600/20',
      order: 7,
    },
    {
      type: 'notification',
      label: 'Notification',
      color: 'bg-pink-500/20 dark:bg-pink-600/20',
      order: 8,
    },
    {
      type: 'condition',
      label: 'Condition',
      color: 'bg-yellow-500/20 dark:bg-yellow-600/20',
      order: 9,
    },
    {
      type: 'loop',
      label: 'Loop',
      color: 'bg-indigo-500/20 dark:bg-indigo-600/20',
      order: 10,
    },
    {
      type: 'apiCall',
      label: 'API Call',
      color: 'bg-emerald-500/20 dark:bg-emerald-600/20',
      order: 11,
    },
    {
      type: 'runner',
      label: 'Workflow Runner',
      color: 'bg-violet-500/20 dark:bg-violet-600/20',
      order: 12,
    },
    // Custom flow nodes with special shapes
    {
      type: 'input',
      label: 'Input',
      color: 'bg-blue-500/20 dark:bg-blue-600/20',
      order: 13,
    },
    {
      type: 'output',
      label: 'Output',
      color: 'bg-blue-500/20 dark:bg-blue-600/20',
      order: 14,
    },
    {
      type: 'process',
      label: 'Process',
      color: 'bg-purple-500/20 dark:bg-purple-600/20',
      order: 15,
    },
    {
      type: 'predefined',
      label: 'Predefined Process',
      color: 'bg-indigo-500/20 dark:bg-indigo-600/20',
      order: 16,
    },
    {
      type: 'document',
      label: 'Document',
      color: 'bg-amber-500/20 dark:bg-amber-600/20',
      order: 17,
    },
  ];

  // Node library order state with localStorage persistence
  const [nodeLibraryOrder, setNodeLibraryOrder] = useState<
    NodeLibraryItemType[]
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedOrder = localStorage.getItem('nodeLibraryOrder');
        if (storedOrder) {
          const parsedOrder: NodeLibraryItemType[] = JSON.parse(storedOrder);
          // Merge with default to ensure all node types are present
          return defaultNodeLibraryOrder
            .map((defaultNode) => {
              const storedNode = parsedOrder.find(
                (n) => n.type === defaultNode.type,
              );
              return storedNode
                ? { ...defaultNode, ...storedNode }
                : defaultNode;
            })
            .sort(
              (a, b) =>
                (a.order ??
                  defaultNodeLibraryOrder.findIndex((n) => n.type === a.type)) -
                (b.order ??
                  defaultNodeLibraryOrder.findIndex((n) => n.type === b.type)),
            );
        }
      } catch (error) {
        console.error(
          'Error parsing node library order from localStorage:',
          error,
        );
      }
    }
    return defaultNodeLibraryOrder;
  });

  // Save node library order to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'nodeLibraryOrder',
          JSON.stringify(nodeLibraryOrder),
        );
      } catch (error) {
        console.error(
          'Error saving node library order to localStorage:',
          error,
        );
      }
    }
  }, [nodeLibraryOrder]);

  // Reset node library order to default
  const resetNodeLibraryOrder = useCallback(() => {
    setNodeLibraryOrder(defaultNodeLibraryOrder);
  }, [defaultNodeLibraryOrder]);

  // Drag state management
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);

  const onAddNode = useCallback(
    (type: NodeType) => {
      if (!reactFlowInstance) return;

      const { label, description } = getNodeLabelAndDescription(type);

      const newNode: CustomNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: Math.random() * 500, y: Math.random() * 500 },
        data: {
          label,
          description,
          status: 'initial',
          config: {},
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, reactFlowInstance],
  );

  const onAddNodeAtHandle = useCallback(
    (
      nodeId: string,
      _handleId: string,
      handleType: 'target' | 'source',
      nodeType: NodeType,
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
          status: 'initial',
          config: {},
        },
      };

      // Create new edge based on handle type
      let newEdge: Edge;
      if (handleType === 'source') {
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
          data: { onAddNode: onAddNode },
          markerEnd: {
            type: 'arrow',
            color: '#94a3b8',
          },
        };
      }

      // Update state
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);
    },
    [reactFlowInstance, setNodes, setEdges],
  );

  const onAddNodeToEdge = useCallback(
    (edgeId: string, nodeType: string) => {
      // Get current edges from React Flow instance
      const currentEdges = reactFlowInstance?.getEdges() || [];
      const edge = currentEdges.find((e) => e.id === edgeId);
      if (!edge) {
        return;
      }

      // Get fixed label and description for the node type
      const { label, description } = getNodeLabelAndDescription(
        nodeType as NodeType,
      );

      // Create new node
      const newNodeId = `${nodeType}-${Date.now()}`;
      const newNode: CustomNode = {
        id: newNodeId,
        type: nodeType as NodeType,
        position: { x: 0, y: 0 }, // Will be positioned by auto-layout
        data: {
          label,
          description,
          status: 'initial',
          config: {},
        },
      };

      // Create new edges
      const newEdge1: Edge = {
        id: `e-${edge.source}-${newNodeId}`,
        source: edge.source,
        target: newNodeId,
        type: 'default',
        data: { onAddNode: onAddNode },
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
        data: { onAddNode: onAddNode },
        markerEnd: {
          type: 'arrow',
          color: '#94a3b8',
        },
      };

      // Update state
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.id !== edgeId);
        return [...updatedEdges, newEdge1, newEdge2];
      });
    },
    [reactFlowInstance, setNodes, setEdges],
  );

  const onConnect = useCallback(
    (params: any) => {
      const newEdge = {
        ...params,
        type: 'default',
        data: { onAddNode: onAddNode },
        markerEnd: {
          type: 'arrow',
          color: '#94a3b8',
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, onAddNode],
  );

  // Helper function to check if a handle is connected to another node
  const isHandleConnected = useCallback(
    (nodeId: string, handleId: string, handleType: 'target' | 'source') => {
      return edges.some((edge) => {
        if (handleType === 'source') {
          // Check if this node is the source of the edge
          // If handleId is specified and edge has sourceHandle, check both node and handle
          // Otherwise, just check the node
          if (handleId && edge.sourceHandle !== undefined) {
            return edge.source === nodeId && edge.sourceHandle === handleId;
          } else {
            return edge.source === nodeId;
          }
        } else {
          // Check if this node is the target of the edge
          // If handleId is specified and edge has targetHandle, check both node and handle
          // Otherwise, just check the node
          if (handleId && edge.targetHandle !== undefined) {
            return edge.target === nodeId && edge.targetHandle === handleId;
          } else {
            return edge.target === nodeId;
          }
        }
      });
    },
    [edges],
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
        onConnect,
        nodeLibraryOrder,
        setNodeLibraryOrder,
        resetNodeLibraryOrder,
        isDraggingNode,
        activeDragType,
        setIsDraggingNode,
        setActiveDragType,
        isHandleConnected,
      }}
    >
      {children}
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider');
  }
  return context;
}
