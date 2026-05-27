import { useDashboardStore } from "../store";

const COMPLEXITY_COLOR: Record<string, string> = {
  simple: "text-green-400",
  moderate: "text-amber-400",
  complex: "text-red-400",
};

export default function NodeInfo() {
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const nodesById = useDashboardStore((s) => s.nodesById);
  const graph = useDashboardStore((s) => s.graph);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const navigateToNode = (id: string) => selectNode(id);

  if (!selectedNodeId) return null;
  const node = nodesById.get(selectedNodeId);
  if (!node) return null;

  const outgoing = graph?.edges.filter((e) => e.source === selectedNodeId) ?? [];
  const incoming = graph?.edges.filter((e) => e.target === selectedNodeId) ?? [];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{node.type}</p>
          <h2 className="text-base font-semibold text-text-primary break-all">{node.name}</h2>
        </div>
        <button onClick={() => selectNode(null)} className="text-text-muted hover:text-text-primary shrink-0 text-xs mt-1">✕</button>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-secondary leading-relaxed">{node.summary}</p>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${COMPLEXITY_COLOR[node.complexity] ?? ""} border-current/30 bg-current/5`}>
          {node.complexity}
        </span>
        {node.filePath && (
          <span className="text-[10px] text-text-muted font-mono bg-elevated px-2 py-0.5 rounded truncate max-w-full">{node.filePath}</span>
        )}
      </div>

      {/* Tags */}
      {node.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-elevated text-text-muted">{tag}</span>
          ))}
        </div>
      )}

      {/* Relationships */}
      {outgoing.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Outgoing ({outgoing.length})</h3>
          <div className="space-y-1">
            {outgoing.slice(0, 8).map((e, i) => {
              const target = nodesById.get(e.target);
              return (
                <button key={i} onClick={() => navigateToNode(e.target)} className="w-full text-left flex items-center gap-2 py-1 hover:bg-elevated rounded px-2 transition-colors">
                  <span className="text-[9px] text-text-muted w-20 shrink-0">{e.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-accent hover:text-accent-bright truncate">{target?.name ?? e.target}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Incoming ({incoming.length})</h3>
          <div className="space-y-1">
            {incoming.slice(0, 8).map((e, i) => {
              const source = nodesById.get(e.source);
              return (
                <button key={i} onClick={() => navigateToNode(e.source)} className="w-full text-left flex items-center gap-2 py-1 hover:bg-elevated rounded px-2 transition-colors">
                  <span className="text-[9px] text-text-muted w-20 shrink-0">{e.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-accent hover:text-accent-bright truncate">{source?.name ?? e.source}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
