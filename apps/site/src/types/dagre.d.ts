declare module 'dagre' {
  export type DagreNode = {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };

  export class Graph {
    setDefaultEdgeLabel(label: () => Record<string, never>): void;
    setGraph(config: { rankdir?: string }): void;
    setNode(id: string, value: { width: number; height: number }): void;
    setEdge(source: string, target: string): void;
    node(id: string): DagreNode;
  }

  export const graphlib: {
    Graph: typeof Graph;
  };

  export function layout(graph: Graph): void;

  const dagre: {
    graphlib: typeof graphlib;
    layout: typeof layout;
  };

  export default dagre;
}
