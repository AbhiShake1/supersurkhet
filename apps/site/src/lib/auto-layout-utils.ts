import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 250;
const nodeHeight = 80;
const conditionNodeWidth = 120;
const conditionNodeHeight = 120;
const startEndNodeWidth = 100;
const startEndNodeHeight = 100;

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB',
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Special handling for different node types
    let width, height;

    if (node.type === 'condition') {
      width = conditionNodeWidth;
      height = conditionNodeHeight;
    } else if (node.type === 'start' || node.type === 'end') {
      width = startEndNodeWidth;
      height = startEndNodeHeight;
    } else {
      width = node.measured?.width || nodeWidth;
      height = node.measured?.height || nodeHeight;
    }

    dagreGraph.setNode(node.id, {
      width,
      height,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Special handling for different node types
    let width, height;

    if (node.type === 'condition') {
      width = conditionNodeWidth;
      height = conditionNodeHeight;
    } else if (node.type === 'start' || node.type === 'end') {
      width = startEndNodeWidth;
      height = startEndNodeHeight;
    } else {
      width = node.measured?.width || nodeWidth;
      height = node.measured?.height || nodeHeight;
    }

    const newNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};
