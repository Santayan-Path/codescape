import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
} from "@xyflow/react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useDashboardStore, NODE_TYPE_TO_CATEGORY } from "../store";
import type { NodeCategory } from "../store";

const NODE_W = 180;
const NODE_H = 48;

// Node type → color mapping
const NODE_COLORS: Record<string, string> = {
  file: "var(--color-node-file)", function: "var(--color-node-function)", class: "var(--color-node-class)",
  module: "var(--color-node-module)", concept: "var(--color-node-concept)", config: "var(--color-node-config)",
  document: "var(--color-node-document)", service: "var(--color-node-service)", table: "var(--color-node-table)",
  endpoint: "var(--color-node-endpoint)", pipeline: "var(--color-node-pipeline)", schema: "var(--color-node-schema)",
  resource: "var(--color-node-resource)", domain: "var(--color-node-concept)", flow: "var(--color-node-pipeline)",
  step: "var(--color-node-function)", article: "var(--color-node-article)", entity: "var(--color-node-entity)",
  topic: "var(--color-node-topic)", claim: "var(--color-node-claim)", source: "var(--color-node-source)",
};

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 40 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

function GraphInner() {
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const nodeTypeFilters = useDashboardStore((s) => s.nodeTypeFilters);

  const searchHitIds = useMemo(() => new Set(searchResults.map((r) => r.nodeId)), [searchResults]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!graph) return;

    const visibleCategories = new Set<NodeCategory>(
      (Object.keys(nodeTypeFilters) as NodeCategory[]).filter((k) => nodeTypeFilters[k])
    );

    const visibleNodes = graph.nodes.filter((n) => {
      const cat = NODE_TYPE_TO_CATEGORY[n.type];
      return visibleCategories.has(cat);
    });
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const hasSearch = searchHitIds.size > 0;

    const rawNodes: Node[] = visibleNodes.map((n) => ({
      id: n.id,
      type: "default",
      position: { x: 0, y: 0 },
      data: { label: n.name },
      style: {
        background: NODE_COLORS[n.type] ?? "#888",
        color: "#0a0a0a",
        border: selectedNodeId === n.id ? "2px solid #d4a574" : "1px solid transparent",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 600,
        width: NODE_W,
        height: NODE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center" as const,
        padding: "4px 8px",
        opacity: hasSearch && !searchHitIds.has(n.id) ? 0.25 : 1,
        transition: "opacity 0.2s, border 0.2s",
      },
    }));

    const rawEdges: Edge[] = graph.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.type.replace(/_/g, " "),
        labelStyle: { fill: "var(--color-text-muted)", fontSize: 9 },
        style: { stroke: "#333", strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#444" },
        animated: false,
      }));

    const laidOut = applyDagreLayout(rawNodes, rawEdges);
    setNodes(laidOut);
    setEdges(rawEdges);
    setTimeout(() => fitView({ padding: 0.15 }), 50);
  }, [graph, nodeTypeFilters, selectedNodeId, searchHitIds, setNodes, setEdges, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    selectNode(node.id === selectedNodeId ? null : node.id);
  }, [selectNode, selectedNodeId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={() => selectNode(null)}
      fitView
      minZoom={0.05}
      maxZoom={3}
      nodesDraggable
      elementsSelectable
    >
      <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={24} size={1} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          const type = (n.data as { label?: string })?.label ? (graph?.nodes.find((gn) => gn.id === n.id)?.type ?? "file") : "file";
          return NODE_COLORS[type] ?? "#888";
        }}
        maskColor="rgba(0,0,0,0.7)"
      />
    </ReactFlow>
  );
}

export default function GraphView() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
