---
name: codescape
description: Analyze a codebase or document set and produce an interactive knowledge graph dashboard. Use when the user wants to analyze, visualize, or explore a project's architecture.
tools: Read, Bash, Glob, Grep, Write
---

# /codescape

Analyze a project and produce a `.codescape/knowledge-graph.json` file that powers the interactive Codescape dashboard.

## Options

`$ARGUMENTS` may contain:
- `--full` — Force a full rebuild even if a graph already exists
- `--open` — Launch the dashboard after analysis
- A directory path (e.g. `/path/to/repo` or `../other-project`) — analyze that directory instead of cwd

---

## Phase 0 — Pre-flight

1. **Resolve `PROJECT_ROOT`:**
   - Parse `$ARGUMENTS` for a non-flag token. If found, resolve it as the target path.
   - If no path argument found, use the current working directory.
   - Verify the resolved path is a directory:
     ```bash
     test -d "<PROJECT_ROOT>" && echo "ok" || echo "not a directory"
     ```
   - If not a directory, report an error and STOP.

2. **Check for an existing graph:**
   - If `$PROJECT_ROOT/.codescape/knowledge-graph.json` exists AND `--full` is NOT in `$ARGUMENTS`:
     Ask the user: "A graph already exists for this project. Would you like to **(a)** do a full rebuild (`--full`) or **(b)** open the existing graph in the dashboard?"
     - If (b), jump straight to Phase 4.
     - If (a), continue with full analysis.

3. **Create a temp fragments directory:**
   ```bash
   FRAGMENTS_DIR=$(mktemp -d)
   echo "Fragments dir: $FRAGMENTS_DIR"
   ```

---

## Phase 1 — Scan

Collect the list of text files to analyze:

```bash
cd "<PROJECT_ROOT>"

if [ -d ".git" ]; then
  git ls-files -z | tr '\0' '\n' | grep -v -E \
    '(^|/)(node_modules|\.git|dist|build|\.next|\.nuxt|\.cache|__pycache__|\.pytest_cache|\.mypy_cache|coverage|\.codescape)(/|$)' | \
  grep -E '\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|c|cpp|h|hpp|cs|rb|php|vue|svelte|md|mdx|txt|yaml|yml|json|toml|xml|html|css|scss|sass|less|sh|bash|zsh|fish|sql|graphql|proto|dockerfile|env\.example)$' | \
  head -500
else
  find . -type f \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
    -not -path '*/build/*' -not -path '*/.next/*' -not -path '*/.codescape/*' \
    -not -path '*/__pycache__/*' -not -path '*/coverage/*' | \
  grep -E '\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|c|cpp|h|hpp|cs|rb|php|vue|svelte|md|mdx|txt|yaml|yml|json|toml|xml|html|css|scss|sass|less|sh|bash|zsh|fish|sql|graphql|proto|dockerfile|env\.example)$' | \
  sed 's|^\./||' | head -500
fi
```

Store as `$FILE_LIST`. Report: `[Phase 1/3] Found N files in <PROJECT_ROOT>`

If 0 files found, report an error and STOP.

---

## Phase 2 — Analyze

Analyze files in batches of 25. For each batch (numbered 1, 2, 3, …):

1. Read the files using the Read tool (absolute paths: `<PROJECT_ROOT>/<relPath>`)
2. Produce a graph fragment JSON object with this exact shape:
   ```json
   {
     "nodes": [...],
     "edges": [...],
     "layers": [...]
   }
   ```
3. **Write the fragment to disk immediately** using the Write tool:
   - Path: `$FRAGMENTS_DIR/fragment-<batch_number>.json`
   - Content: the fragment JSON (do NOT accumulate fragments in memory)

**Node schema:**
- `id` — unique string. For file nodes, use the relative path (e.g. `"src/auth.ts"`). For function/class nodes, use `"<filePath>#<name>"`.
- `type` — one of: `file`, `function`, `class`, `module`, `concept`, `config`, `document`, `service`, `table`, `endpoint`, `pipeline`, `schema`, `resource`, `domain`, `article`, `entity`, `topic`
- `name` — human-readable name
- `filePath` — relative path (for file/function/class nodes)
- `summary` — 1–2 sentence description
- `tags` — array of keyword strings
- `complexity` — `"simple"` | `"moderate"` | `"complex"`

**Edge schema:**
- `source`, `target` — node ids
- `type` — one of: `imports`, `exports`, `contains`, `inherits`, `implements`, `calls`, `depends_on`, `related`, `similar_to`, `documents`, `defines_schema`, `configures`, `reads_from`, `writes_to`
- `direction` — `"forward"` | `"backward"` | `"bidirectional"`
- `weight` — number 0–1

**Layer schema:**
- `id`, `name`, `description` — strings
- `nodeIds` — array of node ids in this layer

**Guidelines:**
- Create one `file` node per file. For larger files, also extract `function`/`class` nodes for key symbols.
- Infer `imports` and `calls` edges from the code.
- Assign nodes to 3–6 logical layers (e.g. "API Layer", "Data Models", "Infrastructure").
- Use consistent layer `id`s across batches so they merge correctly (e.g. always use `"api-layer"` not `"api_layer"`).
- For non-code files (Markdown, YAML, JSON configs), use `document` or `config` types.

Report batch progress: `[Phase 2/3] Batch X/N — <first 3 filenames>`

---

## Phase 3 — Assemble & Save

1. **Write the project metadata** to `$FRAGMENTS_DIR/project-meta.json` using the Write tool:
   ```json
   {
     "name": "<project name from directory basename>",
     "languages": ["<detected languages>"],
     "frameworks": ["<detected frameworks>"],
     "description": "<1–2 sentence project description>",
     "analyzedAt": "<current ISO timestamp>",
     "gitCommitHash": ""
   }
   ```
   Detect languages from file extensions seen in Phase 2. Detect frameworks from package manifests.

2. **Find the plugin root:**
   ```bash
   PLUGIN_ROOT=""
   for candidate in "$HOME/.claude/plugins/codescape" "$HOME/.codescape-plugin" "$HOME/codescape"; do
     if [ -d "$candidate/skills/codescape" ]; then PLUGIN_ROOT="$candidate"; break; fi
   done
   echo "Plugin root: $PLUGIN_ROOT"
   ```

3. **Run the merge script:**
   ```bash
   python3 "$PLUGIN_ROOT/skills/codescape/merge-graph.py" "<PROJECT_ROOT>" "$FRAGMENTS_DIR"
   ```
   This merges all fragment files, deduplicates nodes/edges, and writes the final graph to `<PROJECT_ROOT>/.codescape/knowledge-graph.json` in milliseconds.

4. **Clean up:**
   ```bash
   rm -rf "$FRAGMENTS_DIR"
   ```

5. Report the output from the merge script (it prints node/edge/layer counts).

---

## Phase 4 — Dashboard (optional)

If `--open` is in `$ARGUMENTS`, or if the user asked to open the existing graph:

Run `/codescape-dashboard <PROJECT_ROOT>` to launch the dashboard.

Otherwise, tell the user:
```
Analysis complete. Run `/codescape-dashboard <PROJECT_ROOT>` to explore the graph.
```
