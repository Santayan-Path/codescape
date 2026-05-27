import { useEffect, useState } from "react";
import { validateGraph } from "@codescape/core/schema";
import { useDashboardStore } from "./store";
import GraphView from "./components/GraphView";
import SearchBar from "./components/SearchBar";
import NodeInfo from "./components/NodeInfo";
import ProjectOverview from "./components/ProjectOverview";

export default function App() {
  const setGraph = useDashboardStore((s) => s.setGraph);
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const nodeTypeFilters = useDashboardStore((s) => s.nodeTypeFilters);
  const toggleNodeTypeFilter = useDashboardStore((s) => s.toggleNodeTypeFilter);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/knowledge-graph.json")
      .then((r) => r.json())
      .then((data: unknown) => {
        const result = validateGraph(data);
        if (result.success && result.data) {
          setGraph(result.data);
        } else {
          setLoadError(result.fatal ?? "Invalid knowledge graph");
        }
      })
      .catch((err) => setLoadError(String(err)));
  }, [setGraph]);

  const NODE_CATEGORIES = [
    { key: "code" as const, label: "Code", color: "var(--color-node-file)" },
    { key: "config" as const, label: "Config", color: "var(--color-node-config)" },
    { key: "docs" as const, label: "Docs", color: "var(--color-node-document)" },
    { key: "infra" as const, label: "Infra", color: "var(--color-node-service)" },
    { key: "data" as const, label: "Data", color: "var(--color-node-table)" },
    { key: "domain" as const, label: "Domain", color: "var(--color-node-concept)" },
    { key: "knowledge" as const, label: "Knowledge", color: "var(--color-node-article)" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-root text-text-primary">
      {/* Header */}
      <header className="flex items-center px-5 py-3 bg-surface border-b border-border-subtle shrink-0 gap-4">
        <h1 className="font-heading text-lg text-accent tracking-wide shrink-0">
          {graph?.project.name ?? "Codescape"}
        </h1>
        <div className="w-px h-5 bg-border-subtle" />
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {NODE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => toggleNodeTypeFilter(cat.key)}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                nodeTypeFilters[cat.key]
                  ? "border-border-medium bg-elevated text-text-secondary hover:text-text-primary"
                  : "border-transparent text-text-muted/40 line-through"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color, opacity: nodeTypeFilters[cat.key] ? 1 : 0.3 }} />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Search */}
      <SearchBar />

      {/* Error */}
      {loadError && (
        <div className="px-5 py-3 bg-red-900/30 border-b border-red-700 text-red-200 text-sm">{loadError}</div>
      )}

      {/* Main: graph + sidebar */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 min-h-0">
          <GraphView />
        </div>
        <aside className="w-[320px] shrink-0 bg-surface border-l border-border-subtle overflow-auto">
          {selectedNodeId ? <NodeInfo /> : <ProjectOverview />}
        </aside>
      </div>
    </div>
  );
}
