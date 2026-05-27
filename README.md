# Codescape

Analyze any codebase or document set and explore it as an interactive knowledge graph. Combines LLM intelligence with static analysis to produce a navigable graph of your project's architecture, components, and relationships.

---

## What it produces

Running Codescape on a project writes `.codescape/knowledge-graph.json` — a validated graph of nodes (files, classes, functions, services, documents, …) and typed edges (imports, calls, depends_on, …) grouped into logical layers. The dashboard visualizes this graph as an interactive React Flow canvas with search, filtering, and a detail sidebar.

---

## Quick start (no Node.js, no API key)

If you have Claude Code and Docker Desktop, this is all you need:

```bash
# 1. Install the skill (one-time)
~/path/to/codescape/install-skill.sh

# 2. Build the Docker image so the dashboard can be served (one-time, ~2 min)
cd ~/path/to/codescape
docker compose build
```

Then in any Claude Code session:

```
# Analyze a project (Claude does this — no API key needed)
/codescape /path/to/your/project

# Open the dashboard (served via Docker)
/codescape-dashboard /path/to/your/project
```

Open **http://localhost:3141** in your browser.

---

## Three ways to run

| Option | Best for | Requires |
|---|---|---|
| **Claude Code skill** | No API key — Claude does the analysis | Claude Code |
| **Docker** | Isolated environment, API-key analysis | Docker + Anthropic API key |
| **Standalone CLI** | Scripting, CI, automation | Node.js 22+ + API key or Claude Code |

---

## Option A — Claude Code skill (recommended, no API key)

The skill uses Claude's own capabilities — no API key, no extra cost. Claude reads your files and produces the knowledge graph directly inside the active session. The dashboard is served via Docker (pre-built image) so Node.js is never required.

### 1. Install the skill (one-time)

```bash
~/path/to/codescape/install-skill.sh
```

This copies the plugin to `~/.claude/plugins/codescape` and installs `/codescape` and `/codescape-dashboard` as global commands. No reload needed.

### 2. Build the Docker image for the dashboard (one-time)

```bash
cd ~/path/to/codescape
docker compose build
```

Only needed to serve the dashboard. Skip if you have Node.js installed and will build the dashboard manually.

### 3. Analyze a project

```
/codescape
```

Analyzes the current working directory. Options:

| Argument | Effect |
|---|---|
| `/codescape /path/to/project` | Analyze a specific directory |
| `/codescape --full` | Force a full rebuild (ignore existing graph) |
| `/codescape --open` | Launch the dashboard after analysis |

The skill runs in three phases:

1. **Scan** — uses `git ls-files` (or `find`) to collect text files, respects `.gitignore`
2. **Analyze** — reads files in batches of 25; Claude produces a graph fragment per batch and writes it to a temp file
3. **Assemble** — `merge-graph.py` merges all fragments instantly via Python, saves `knowledge-graph.json`

### 4. Open the dashboard

```
/codescape-dashboard
```

Or for a specific project:

```
/codescape-dashboard /path/to/project
```

Automatically picks the best available method:
- **Pre-built dist** — if you've built the dashboard with Node.js
- **Docker** — falls back to the pre-built Docker image (recommended if no Node.js)

Opens at **http://localhost:3141**. To stop the Docker container: `docker stop codescape-dashboard`

### After making changes to codescape

Re-run `install-skill.sh` to sync the updated files. No reload needed.

---

## Option B — Docker (requires Anthropic API key)

> Docker runs as a standalone process with no access to your Claude Code session, so an Anthropic API key is required for the analysis step. To analyze without an API key, use the Claude Code skill above.

No Node.js, no pnpm, no build steps. Everything runs inside a container.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Configure

```bash
cd ~/path/to/codescape
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...          # your Anthropic API key
PROJECT=/absolute/path/to/your/repo   # project you want to analyze
PORT=3141                              # dashboard port (optional, default 3141)
```

### 2. Build the image (one-time, ~2 minutes)

```bash
docker compose build
```

### 3. Analyze a project

```bash
docker compose run --rm analyze
```

Scans `$PROJECT`, calls the LLM in batches, and writes `.codescape/knowledge-graph.json` into the project directory.

### 4. Open the dashboard

```bash
docker compose up dashboard
```

Open **http://localhost:3141** in your browser.

### One-liner: analyze + serve

```bash
docker compose run --rm --service-ports full
```

Analyzes the project then immediately serves the dashboard. Blocks until `Ctrl+C`.

### Switching projects

```bash
PROJECT=/path/to/other/repo docker compose run --rm analyze
PROJECT=/path/to/other/repo docker compose up dashboard
```

### Docker services reference

| Service | Command | What it does |
|---|---|---|
| `analyze` | `docker compose run --rm analyze` | Analyze `$PROJECT`, write graph |
| `dashboard` | `docker compose up dashboard` | Serve dashboard on `$PORT` |
| `full` | `docker compose run --rm --service-ports full` | Analyze then serve |

---

## Option C — Standalone CLI (requires Node.js)

Useful for scripting, CI pipelines, or running outside Claude Code.

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10 — `npm install -g pnpm`

### Install dependencies

```bash
cd ~/path/to/codescape
pnpm install
pnpm build:core
```

### LLM backend (priority order)

| Priority | Backend | When available |
|---|---|---|
| 1st | `claude --print` | Running inside Claude Code terminal (`!` prefix) |
| 2nd | Anthropic SDK | `ANTHROPIC_API_KEY` env var is set |

### Analyze a project

**Inside Claude Code — no API key needed:**

```
! pnpm analyze analyze /path/to/project
```

**Outside Claude Code — API key required:**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pnpm analyze analyze /path/to/project
```

**Flags:**

```
path                  Directory to analyze (default: current directory)
--full                Force full rebuild even if a graph already exists
--open                Launch the dashboard after analysis
--max-files <n>       Maximum files to scan (default: 500)
--max-file-size <kb>  Maximum file size in KB (default: 100)
```

### View the dashboard

**Dev mode (hot-reload):**

```bash
GRAPH_DIR=/path/to/project/.codescape pnpm dev:dashboard
# Open http://localhost:3141
```

**Built CLI serve:**

```bash
pnpm build:cli && pnpm build:dashboard
node cli/dist/index.js serve /path/to/project
```

---

## Dashboard features

| Feature | How |
|---|---|
| **Node graph** | dagre-layout React Flow canvas — drag, zoom, pan |
| **Node detail** | Click any node → sidebar shows summary, tags, complexity, in/out edges |
| **Search** | Fuse.js fuzzy search across all node names, summaries, and tags |
| **Filter by type** | Toggle Code / Config / Docs / Infra / Data / Domain / Knowledge |
| **Project overview** | Stats, language list, framework list, layer breakdown |

---

## Repo structure

```
codescape/
├── packages/
│   ├── core/               # Schema (Zod), types, search (Fuse.js), persistence
│   └── dashboard/          # React 19 + React Flow + Tailwind v4 UI
├── cli/                    # Standalone CLI — codescape analyze / serve
├── skills/
│   ├── codescape/          # /codescape skill + merge-graph.py
│   └── codescape-dashboard/ # /codescape-dashboard skill
├── .claude-plugin/         # Claude Code plugin manifest
├── install-skill.sh        # One-command skill installer
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # analyze / dashboard / full services
└── .env.example            # Environment variable template
```

---

## Development

### Build individual packages

```bash
pnpm build:core        # packages/core → dist/
pnpm build:cli         # cli/ → dist/
pnpm build:dashboard   # packages/dashboard → dist/
pnpm build             # core + cli together
```

### Run dashboard in dev mode

```bash
GRAPH_DIR=/some/project/.codescape pnpm dev:dashboard
```

### Run tests

```bash
pnpm --filter @codescape/core test
```

---

## Knowledge graph schema

```json
{
  "version": "1.0.0",
  "kind": "codebase",
  "project": {
    "name": "my-project",
    "languages": ["TypeScript", "Python"],
    "frameworks": ["React", "FastAPI"],
    "description": "...",
    "analyzedAt": "2026-05-27T12:00:00.000Z",
    "gitCommitHash": ""
  },
  "nodes": [
    {
      "id": "src/auth.ts",
      "type": "file",
      "name": "auth.ts",
      "filePath": "src/auth.ts",
      "summary": "JWT authentication middleware and token utilities.",
      "tags": ["auth", "jwt", "middleware"],
      "complexity": "moderate"
    }
  ],
  "edges": [
    {
      "source": "src/index.ts",
      "target": "src/auth.ts",
      "type": "imports",
      "direction": "forward",
      "weight": 0.8
    }
  ],
  "layers": [
    {
      "id": "api-layer",
      "name": "API Layer",
      "description": "HTTP endpoints and routing",
      "nodeIds": ["src/routes/users.ts", "src/routes/auth.ts"]
    }
  ],
  "tour": []
}
```

**21 node types:** `file`, `function`, `class`, `module`, `concept`, `config`, `document`, `service`, `table`, `endpoint`, `pipeline`, `schema`, `resource`, `domain`, `flow`, `step`, `article`, `entity`, `topic`, `claim`, `source`

**35 edge types** across 8 categories: structural, behavioral, data flow, dependencies, semantic, infrastructure, domain, knowledge

---

## How the Claude skill works (internals)

The `/codescape` skill is a markdown file (`~/.claude/commands/codescape.md`) that instructs Claude Code to:

1. Scan the project using `git ls-files` or `find` — no Node.js needed
2. Read files in batches of 25 using the `Read` tool
3. Write each batch's graph fragment to a temp file using the `Write` tool
4. Run `merge-graph.py` (Python 3) to merge all fragments and save the final graph

**Claude is the LLM** — no API key is consumed. Python handles the merge so Claude never has to generate thousands of lines of JSON at once.

The `/codescape-dashboard` skill serves the graph via the pre-built Docker image, falling back to a locally built dist if available.

---

## License

MIT
