---
name: codescape-dashboard
description: Launch the Codescape interactive knowledge graph dashboard for a project. Use when the user wants to open or view the codescape dashboard.
tools: Read, Bash, Write
---

# /codescape-dashboard

Start the Codescape dashboard to visualize the knowledge graph for a project.

## Instructions

1. **Determine the project directory:**
   - If `$ARGUMENTS` contains a path, use that.
   - Otherwise use the current working directory.

2. **Check the graph exists:**
   ```bash
   test -f "<PROJECT_ROOT>/.codescape/knowledge-graph.json" && echo "found" || echo "missing"
   ```
   If missing, tell the user to run `/codescape` first, then STOP.

3. **Find the plugin root:**
   ```bash
   PLUGIN_ROOT=""
   for candidate in "$HOME/.claude/plugins/codescape" "$HOME/.codescape-plugin" "$HOME/codescape"; do
     if [ -d "$candidate/packages/dashboard" ]; then PLUGIN_ROOT="$candidate"; break; fi
   done
   echo "Plugin root: $PLUGIN_ROOT"
   ```

4. **Choose a serving method** — try in this order:

   ---

   ### Method A — Pre-built dashboard (fastest)

   ```bash
   test -d "$PLUGIN_ROOT/packages/dashboard/dist" && echo "built" || echo "not built"
   ```

   If built, serve with the CLI:
   ```bash
   node "$PLUGIN_ROOT/cli/dist/index.js" serve "<PROJECT_ROOT>" &
   ```
   Report: `Dashboard running at http://localhost:3141` then STOP.

   ---

   ### Method B — Docker (no Node.js required)

   If not built, check if Docker is available:
   ```bash
   docker info > /dev/null 2>&1 && echo "available" || echo "unavailable"
   ```

   If available, run:
   ```bash
   docker run --rm -d \
     -v "<PROJECT_ROOT>:/project" \
     -p 3141:3141 \
     --name codescape-dashboard \
     codescape-dashboard:latest serve /project
   ```

   Wait 2 seconds, then check it started:
   ```bash
   docker ps --filter name=codescape-dashboard --format "{{.Status}}"
   ```

   Report:
   ```
   Dashboard running at http://localhost:3141 (via Docker)
   Viewing: <PROJECT_ROOT>/.codescape/knowledge-graph.json

   Open http://localhost:3141 in your browser.
   To stop: docker stop codescape-dashboard
   ```
   Then STOP.

   ---

   ### Method C — Nothing available

   If neither works, tell the user:
   ```
   The dashboard requires either:
     • Node.js ≥ 22 + pnpm (brew install node → pnpm install && pnpm build:dashboard)
     • Docker (docker compose build in the codescape directory)
   ```

## Notes

- Port 3141 is the default.
- To stop the Docker container: `docker stop codescape-dashboard`
- To rebuild the Docker image: `docker compose build` in the codescape repo directory.
