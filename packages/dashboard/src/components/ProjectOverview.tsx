import { useDashboardStore } from "../store";

export default function ProjectOverview() {
  const graph = useDashboardStore((s) => s.graph);

  if (!graph) return (
    <div className="p-4 text-text-muted text-sm">Loading graph...</div>
  );

  const { project, nodes, edges, layers } = graph;

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="font-heading text-lg text-accent mb-1">{project.name}</h2>
        <p className="text-sm text-text-secondary leading-relaxed">{project.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Nodes", value: nodes.length },
          { label: "Edges", value: edges.length },
          { label: "Layers", value: layers.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-elevated rounded-lg p-2 text-center">
            <div className="text-lg font-semibold text-text-primary">{stat.value}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {project.languages.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Languages</h3>
          <div className="flex flex-wrap gap-1">
            {project.languages.map((lang) => (
              <span key={lang} className="text-xs px-2 py-0.5 rounded bg-elevated text-text-secondary">{lang}</span>
            ))}
          </div>
        </div>
      )}

      {project.frameworks.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Frameworks</h3>
          <div className="flex flex-wrap gap-1">
            {project.frameworks.map((fw) => (
              <span key={fw} className="text-xs px-2 py-0.5 rounded bg-elevated text-text-accent/80 border border-accent/20">{fw}</span>
            ))}
          </div>
        </div>
      )}

      {layers.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Layers</h3>
          <div className="space-y-1">
            {layers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-elevated">
                <span className="text-xs text-text-secondary">{layer.name}</span>
                <span className="text-[10px] text-text-muted">{layer.nodeIds.length} nodes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-text-muted">Click any node in the graph to explore it.</p>
    </div>
  );
}
