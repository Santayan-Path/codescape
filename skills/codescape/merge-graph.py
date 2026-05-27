#!/usr/bin/env python3
"""
merge-graph.py <project_root> <fragments_dir>

Reads all fragment JSON files from <fragments_dir>, merges them into a single
knowledge graph, and writes it to <project_root>/.codescape/knowledge-graph.json

Fragment files must be named fragment-*.json, each containing:
  { "nodes": [...], "edges": [...], "layers": [...] }

The project metadata is read from <fragments_dir>/project-meta.json:
  { "name": ..., "languages": [...], "frameworks": [...], "description": ...,
    "analyzedAt": ..., "gitCommitHash": "" }
"""
import json, sys, os, glob
from pathlib import Path

project_root = sys.argv[1]
fragments_dir = sys.argv[2]

nodes_by_id = {}
edges_seen = set()
edges = []
layers_by_id = {}

for fpath in sorted(glob.glob(os.path.join(fragments_dir, "fragment-*.json"))):
    with open(fpath) as f:
        try:
            frag = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Warning: skipping {fpath}: {e}", file=sys.stderr)
            continue

    for node in frag.get("nodes", []):
        nid = node.get("id")
        if nid and nid not in nodes_by_id:
            nodes_by_id[nid] = node

    for edge in frag.get("edges", []):
        key = (edge.get("source"), edge.get("target"), edge.get("type"))
        if all(key) and key not in edges_seen:
            edges_seen.add(key)
            edges.append(edge)

    for layer in frag.get("layers", []):
        lid = layer.get("id")
        if not lid:
            continue
        if lid not in layers_by_id:
            layers_by_id[lid] = {**layer, "nodeIds": list(layer.get("nodeIds", []))}
        else:
            existing_ids = set(layers_by_id[lid]["nodeIds"])
            for nid in layer.get("nodeIds", []):
                if nid not in existing_ids:
                    layers_by_id[lid]["nodeIds"].append(nid)
                    existing_ids.add(nid)

meta_path = os.path.join(fragments_dir, "project-meta.json")
if os.path.exists(meta_path):
    with open(meta_path) as f:
        project_meta = json.load(f)
else:
    project_meta = {
        "name": Path(project_root).name,
        "languages": [],
        "frameworks": [],
        "description": "",
        "analyzedAt": "",
        "gitCommitHash": ""
    }

graph = {
    "version": "1.0.0",
    "kind": "codebase",
    "project": project_meta,
    "nodes": list(nodes_by_id.values()),
    "edges": edges,
    "layers": list(layers_by_id.values()),
    "tour": []
}

out_dir = Path(project_root) / ".codescape"
out_dir.mkdir(parents=True, exist_ok=True)

graph_path = out_dir / "knowledge-graph.json"
with open(graph_path, "w") as f:
    json.dump(graph, f, indent=2)

meta_out = {
    "lastAnalyzedAt": project_meta.get("analyzedAt", ""),
    "gitCommitHash": "",
    "version": "1.0.0",
    "analyzedFiles": len(graph["nodes"])
}
with open(out_dir / "meta.json", "w") as f:
    json.dump(meta_out, f, indent=2)

print(f"Saved: {graph_path}")
print(f"Nodes: {len(graph['nodes'])}  Edges: {len(graph['edges'])}  Layers: {len(graph['layers'])}")
