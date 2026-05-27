import { create } from "zustand";
import { SearchEngine } from "@codescape/core/search";
import type { SearchResult } from "@codescape/core/search";
import type { GraphNode, KnowledgeGraph } from "@codescape/core/types";

export type NodeCategory = "code" | "config" | "docs" | "infra" | "data" | "domain" | "knowledge";
export type NodeType = GraphNode["type"];

interface DashboardStore {
  graph: KnowledgeGraph | null;
  nodesById: Map<string, GraphNode>;
  selectedNodeId: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  searchEngine: SearchEngine | null;
  nodeTypeFilters: Record<NodeCategory, boolean>;
  codeViewerOpen: boolean;
  codeViewerNodeId: string | null;
  codeViewerExpanded: boolean;

  setGraph: (graph: KnowledgeGraph) => void;
  selectNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleNodeTypeFilter: (category: NodeCategory) => void;
  openCodeViewer: (nodeId: string) => void;
  closeCodeViewer: () => void;
  expandCodeViewer: () => void;
  collapseCodeViewer: () => void;
}

export const NODE_TYPE_TO_CATEGORY: Record<NodeType, NodeCategory> = {
  file: "code", function: "code", class: "code", module: "code", concept: "code",
  config: "config",
  document: "docs",
  service: "infra", resource: "infra", pipeline: "infra",
  table: "data", endpoint: "data", schema: "data",
  domain: "domain", flow: "domain", step: "domain",
  article: "knowledge", entity: "knowledge", topic: "knowledge", claim: "knowledge", source: "knowledge",
};

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  graph: null,
  nodesById: new Map(),
  selectedNodeId: null,
  searchQuery: "",
  searchResults: [],
  searchEngine: null,
  nodeTypeFilters: { code: true, config: true, docs: true, infra: true, data: true, domain: true, knowledge: true },
  codeViewerOpen: false,
  codeViewerNodeId: null,
  codeViewerExpanded: false,

  setGraph: (graph) => {
    const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
    const searchEngine = new SearchEngine(graph.nodes);
    set({ graph, nodesById, searchEngine, selectedNodeId: null, searchQuery: "", searchResults: [] });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setSearchQuery: (query) => {
    const engine = get().searchEngine;
    if (!engine || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }
    const searchResults = engine.search(query);
    set({ searchQuery: query, searchResults });
  },

  toggleNodeTypeFilter: (category) =>
    set((state) => ({
      nodeTypeFilters: { ...state.nodeTypeFilters, [category]: !state.nodeTypeFilters[category] },
    })),

  openCodeViewer: (nodeId) => set({ codeViewerOpen: true, codeViewerNodeId: nodeId, codeViewerExpanded: false }),
  closeCodeViewer: () => set({ codeViewerOpen: false, codeViewerNodeId: null, codeViewerExpanded: false }),
  expandCodeViewer: () => set({ codeViewerExpanded: true }),
  collapseCodeViewer: () => set({ codeViewerExpanded: false }),
}));
