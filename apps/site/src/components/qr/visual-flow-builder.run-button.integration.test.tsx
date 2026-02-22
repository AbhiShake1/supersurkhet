// @vitest-environment jsdom

import type React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataMatrixAction } from '@/lib/datamatrix';

type XYFlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    status?: string;
    [key: string]: unknown;
  };
};

type XYFlowEdge = {
  id: string;
  source: string;
  target: string;
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

const createdActions: DataMatrixAction[] = [];
let executeImplementation: () => Promise<void> = async () => undefined;

function createDeferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function waitForAssertion(
  assertion: () => void,
  timeoutMs = 3000,
): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  throw (lastError ?? new Error('Assertion timed out')) as Error;
}

async function flushDomUpdates(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children?: React.ReactNode }) => (
    <>{children ?? null}</>
  ),
  KeyboardSensor: class MockKeyboardSensor {},
  PointerSensor: class MockPointerSensor {},
  TouchSensor: class MockTouchSensor {},
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock('@/components/ui/sortable', () => ({
  Sortable: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SortableContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SortableItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SortableItemHandle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SortableOverlay: ({ children }: { children?: React.ReactNode }) => (
    <>{children ?? null}</>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

vi.mock('@/components/ui/custom-select', () => ({
  CustomSelect: ({ value }: { value?: string }) => <div>{value ?? ''}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/copy-button', () => ({
  CopyButton: () => <button type="button">Copy</button>,
}));

vi.mock('@/components/zoom-slider', () => ({
  ZoomSlider: () => <div>Zoom</div>,
}));

vi.mock('@/components/ui/datamatrix-code', () => ({
  DataMatrixCode: () => <div data-testid="datamatrix-code" />,
}));

vi.mock('@/lib/datamatrix/action-executor', () => ({
  ActionExecutor: class MockActionExecutor {
    constructor(action: DataMatrixAction) {
      createdActions.push(action);
    }

    execute() {
      return executeImplementation();
    }
  },
}));

vi.mock('@/components/flow-context', () => {
  type NodeLibraryItem = {
    type: string;
    label: string;
    color: string;
    order?: number;
  };

  const defaultNodeLibraryOrder: NodeLibraryItem[] = [
    {
      type: 'navigate',
      label: 'Navigation',
      color: 'bg-cyan-500/20',
      order: 1,
    },
  ];

  const flowState = {
    nodes: [] as XYFlowNode[],
    edges: [] as XYFlowEdge[],
    nodesHistory: [] as XYFlowNode[][],
    nodeLibraryOrder: cloneValue(defaultNodeLibraryOrder),
    isDraggingNode: false,
    activeDragType: null as string | null,
  };

  const flowApi = {
    get nodes() {
      return flowState.nodes;
    },
    get edges() {
      return flowState.edges;
    },
    onNodesChange: () => undefined,
    onEdgesChange: () => undefined,
    setNodes: (
      updater: XYFlowNode[] | ((nodes: XYFlowNode[]) => XYFlowNode[]),
    ) => {
      const next =
        typeof updater === 'function'
          ? updater(flowState.nodes)
          : cloneValue(updater);
      flowState.nodes = cloneValue(next);
      flowState.nodesHistory.push(cloneValue(next));
    },
    setEdges: (
      updater: XYFlowEdge[] | ((edges: XYFlowEdge[]) => XYFlowEdge[]),
    ) => {
      const next =
        typeof updater === 'function'
          ? updater(flowState.edges)
          : cloneValue(updater);
      flowState.edges = cloneValue(next);
    },
    onAddNode: () => undefined,
    onAddNodeAtHandle: () => undefined,
    onAddNodeToEdge: () => undefined,
    onConnect: () => undefined,
    get nodeLibraryOrder() {
      return flowState.nodeLibraryOrder;
    },
    setNodeLibraryOrder: (order: NodeLibraryItem[]) => {
      flowState.nodeLibraryOrder = cloneValue(order);
    },
    resetNodeLibraryOrder: () => {
      flowState.nodeLibraryOrder = cloneValue(defaultNodeLibraryOrder);
    },
    get isDraggingNode() {
      return flowState.isDraggingNode;
    },
    get activeDragType() {
      return flowState.activeDragType;
    },
    setIsDraggingNode: (isDragging: boolean) => {
      flowState.isDraggingNode = isDragging;
    },
    setActiveDragType: (type: string | null) => {
      flowState.activeDragType = type;
    },
    isHandleConnected: () => false,
  };

  return {
    FlowProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useFlow: () => flowApi,
    __setMockFlowState: ({
      nodes,
      edges,
    }: {
      nodes: XYFlowNode[];
      edges: XYFlowEdge[];
    }) => {
      flowState.nodes = cloneValue(nodes);
      flowState.edges = cloneValue(edges);
      flowState.nodesHistory = [cloneValue(nodes)];
      flowState.nodeLibraryOrder = cloneValue(defaultNodeLibraryOrder);
      flowState.isDraggingNode = false;
      flowState.activeDragType = null;
    },
    __resetMockFlowState: () => {
      flowState.nodes = [];
      flowState.edges = [];
      flowState.nodesHistory = [];
      flowState.nodeLibraryOrder = cloneValue(defaultNodeLibraryOrder);
      flowState.isDraggingNode = false;
      flowState.activeDragType = null;
    },
    __getLatestNodes: () => cloneValue(flowState.nodes),
    __getNodesHistory: () => cloneValue(flowState.nodesHistory),
  };
});

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Background: () => null,
  BackgroundVariant: {
    Dots: 'dots',
  },
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  Handle: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  BaseEdge: () => null,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  getBezierPath: () => ['M0,0 L1,1', 0, 0],
  getSmoothStepPath: () => ['M0,0 L1,1', 0, 0],
  getStraightPath: () => ['M0,0 L1,1', 0, 0],
  useStore: (
    selector: (state: { nodeLookup: Map<string, unknown> }) => unknown,
  ) => selector({ nodeLookup: new Map() }),
  useReactFlow: () => ({
    fitView: () => undefined,
    screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    getEdges: () => [],
    setNodes: () => undefined,
    setEdges: () => undefined,
  }),
  addEdge: (edge: XYFlowEdge, edges: XYFlowEdge[]) => [...edges, edge],
}));

type FlowContextMock = {
  __setMockFlowState: (state: {
    nodes: XYFlowNode[];
    edges: XYFlowEdge[];
  }) => void;
  __resetMockFlowState: () => void;
  __getLatestNodes: () => XYFlowNode[];
  __getNodesHistory: () => XYFlowNode[][];
};

function getNodeStatus(
  nodes: XYFlowNode[],
  nodeId: string,
): string | undefined {
  return nodes.find((node) => node.id === nodeId)?.data.status as
    | string
    | undefined;
}

function createInitialGraphState() {
  const nodes: XYFlowNode[] = [
    {
      id: 'navigate-1',
      type: 'navigate',
      position: { x: 100, y: 100 },
      data: {
        label: 'Navigation',
        status: 'initial',
        config: {
          url: 'https://supersurkhet.com/welcome',
        },
      },
    },
    {
      id: 'runner-1',
      type: 'runner',
      position: { x: 320, y: 100 },
      data: {
        label: 'Workflow Runner',
        status: 'initial',
        config: {
          mode: 'sequential',
        },
      },
    },
    {
      id: 'wifi-1',
      type: 'wifiConnect',
      position: { x: 540, y: 100 },
      data: {
        label: 'WiFi Connection',
        status: 'initial',
        config: {},
      },
    },
  ];

  const edges: XYFlowEdge[] = [
    {
      id: 'e-navigate-1-runner-1',
      source: 'navigate-1',
      target: 'runner-1',
    },
  ];

  return { nodes, edges };
}

describe('VisualFlowBuilder run button integration', () => {
  let flowContextMock: FlowContextMock;
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  beforeEach(async () => {
    createdActions.length = 0;
    executeImplementation = async () => undefined;

    flowContextMock = (await import(
      '@/components/flow-context'
    )) as unknown as FlowContextMock;
    flowContextMock.__resetMockFlowState();
    flowContextMock.__setMockFlowState(createInitialGraphState());

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }

    if (container) {
      container.remove();
      container = null;
    }

    consoleErrorSpy.mockClear();
  });

  async function renderBuilder(): Promise<void> {
    if (!container) {
      throw new Error('Test container is not initialized');
    }

    const { VisualFlowBuilder } = await import('./visual-flow-builder');
    root = createRoot(container);
    root.render(<VisualFlowBuilder />);
    await flushDomUpdates();
  }

  function clickRunWorkflowButton(): void {
    if (!container) {
      throw new Error('Test container is not initialized');
    }

    const runButton = container.querySelector(
      'button[aria-label="Run Workflow"]',
    ) as HTMLButtonElement | null;

    if (!runButton) {
      throw new Error('Run Workflow button not found');
    }

    runButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  it('applies loading then success statuses for involved nodes on successful run', async () => {
    const deferred = createDeferred();
    executeImplementation = () => deferred.promise;

    await renderBuilder();
    clickRunWorkflowButton();

    await waitForAssertion(() => {
      const latest = flowContextMock.__getLatestNodes();
      expect(getNodeStatus(latest, 'runner-1')).toBe('loading');
      expect(getNodeStatus(latest, 'navigate-1')).toBe('loading');
      expect(getNodeStatus(latest, 'wifi-1')).toBe('initial');
    });

    deferred.resolve();

    await waitForAssertion(() => {
      const latest = flowContextMock.__getLatestNodes();
      expect(getNodeStatus(latest, 'runner-1')).toBe('success');
      expect(getNodeStatus(latest, 'navigate-1')).toBe('success');
      expect(getNodeStatus(latest, 'wifi-1')).toBe('initial');
    });

    expect(createdActions).toHaveLength(1);
    expect(createdActions[0]?.action).toBe('navigate');
  });

  it('applies loading then error statuses for involved nodes on failed run', async () => {
    const deferred = createDeferred();
    executeImplementation = () => deferred.promise;

    await renderBuilder();
    clickRunWorkflowButton();

    await waitForAssertion(() => {
      const latest = flowContextMock.__getLatestNodes();
      expect(getNodeStatus(latest, 'runner-1')).toBe('loading');
      expect(getNodeStatus(latest, 'navigate-1')).toBe('loading');
    });

    deferred.reject(new Error('execution failed'));

    await waitForAssertion(() => {
      const latest = flowContextMock.__getLatestNodes();
      expect(getNodeStatus(latest, 'runner-1')).toBe('error');
      expect(getNodeStatus(latest, 'navigate-1')).toBe('error');
      expect(getNodeStatus(latest, 'wifi-1')).toBe('initial');
    });

    const snapshots = flowContextMock.__getNodesHistory();
    expect(snapshots.length).toBeGreaterThan(2);
  });
});
