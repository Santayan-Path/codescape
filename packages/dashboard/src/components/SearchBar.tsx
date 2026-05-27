import { useDashboardStore } from "../store";

export default function SearchBar() {
  const searchQuery = useDashboardStore((s) => s.searchQuery);
  const setSearchQuery = useDashboardStore((s) => s.setSearchQuery);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const graph = useDashboardStore((s) => s.graph);
  const selectNode = useDashboardStore((s) => s.selectNode);

  const hitIds = new Set(searchResults.map((r) => r.nodeId));

  return (
    <div className="relative bg-surface border-b border-border-subtle">
      <div className="flex items-center px-4 py-2 gap-3">
        <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
          data-testid="search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text-primary text-xs">
            ✕
          </button>
        )}
      </div>
      {searchQuery && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-surface border border-border-medium rounded-b-lg shadow-2xl max-h-60 overflow-y-auto">
          {searchResults.slice(0, 20).map((r) => {
            const node = graph?.nodes.find((n) => n.id === r.nodeId);
            if (!node) return null;
            return (
              <button
                key={r.nodeId}
                onClick={() => { selectNode(r.nodeId); setSearchQuery(""); }}
                className="w-full px-4 py-2 text-left hover:bg-elevated transition-colors flex items-center gap-3"
              >
                <span className="text-xs text-text-muted w-16 shrink-0">{node.type}</span>
                <span className="text-sm text-text-primary truncate">{node.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
