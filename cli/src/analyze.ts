import { execSync } from "node:child_process";
import type { KnowledgeGraph, GraphNode, GraphEdge, Layer } from "@codescape/core";
import { validateGraph } from "@codescape/core/schema";
import type { ScannedFile } from "./scanner.js";

// ---------------------------------------------------------------------------
// LLM backend — uses `claude --print` (Claude Code CLI) if available,
// falls back to Anthropic SDK if ANTHROPIC_API_KEY is set.
// ---------------------------------------------------------------------------

async function callLLM(systemPrompt: string, userContent: string): Promise<string> {
  // Try claude CLI first (uses existing Claude Code session, no API key needed)
  try {
    const prompt = `${systemPrompt}\n\n${userContent}`;
    const result = execSync(`claude --print ${shellEscape(prompt)}`, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return result.toString("utf-8").trim();
  } catch (claudeErr) {
    // claude CLI not available or failed — try Anthropic SDK
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "No LLM backend available.\n" +
        "  Option 1: Run from Claude Code — the `claude` CLI will be used automatically.\n" +
        "  Option 2: Set ANTHROPIC_API_KEY to use the Anthropic SDK directly.",
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
  }
}

function shellEscape(str: string): string {
  // Wrap in single quotes, escaping any single quotes inside
  return `'${str.replace(/'/g, "'\\''")}'`;
}

// ---------------------------------------------------------------------------
// Analysis pipeline
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a code analysis engine. Given a batch of files from a software project (or document set), produce a JSON knowledge graph fragment.

Return ONLY valid JSON — no markdown, no commentary, no code fences.

Your output must be a JSON object with this shape:
{
  "nodes": [...],
  "edges": [...],
  "layers": [...]
}

Node schema:
- id: string (unique, use relative file path for file nodes, e.g. "src/auth.ts")
- type: one of: file, function, class, module, concept, config, document, service, table, endpoint, pipeline, schema, resource, domain, article, entity, topic
- name: string (human-readable name)
- filePath: string (relative path, only for file/function/class nodes)
- lineRange: [start, end] (optional, 1-based)
- summary: string (1-2 sentence description)
- tags: string[] (keywords)
- complexity: "simple" | "moderate" | "complex"

Edge schema:
- source: node id
- target: node id
- type: one of: imports, exports, contains, inherits, implements, calls, depends_on, related, similar_to, documents, defines_schema, configures, reads_from, writes_to
- direction: "forward" | "backward" | "bidirectional"
- weight: number 0-1
- description: string (optional)

Layer schema:
- id: string
- name: string (e.g. "API Layer", "Data Models", "Configuration")
- description: string
- nodeIds: string[]

Guidelines:
- Create one "file" node per file. For large files, also create function/class nodes for key symbols.
- Infer imports and calls from the code.
- Group related nodes into layers (3-6 layers is ideal).
- Be concise but accurate in summaries.`;

function chunkFiles(files: ScannedFile[], targetTokens = 6000): ScannedFile[][] {
  const batches: ScannedFile[][] = [];
  let current: ScannedFile[] = [];
  let currentSize = 0;
  for (const file of files) {
    const approxTokens = Math.ceil(file.content.length / 4);
    if (currentSize + approxTokens > targetTokens && current.length > 0) {
      batches.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(file);
    currentSize += approxTokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function formatBatch(files: ScannedFile[]): string {
  return files.map((f) => `=== ${f.path} ===\n${f.content.slice(0, 8000)}`).join("\n\n");
}

interface GraphFragment {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layers: Layer[];
}

async function analyzeBatch(files: ScannedFile[], batchIndex: number, totalBatches: number): Promise<GraphFragment> {
  const userContent = `Analyze this batch of files (${batchIndex + 1}/${totalBatches}):\n\n${formatBatch(files)}`;
  const text = await callLLM(SYSTEM_PROMPT, userContent);

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as GraphFragment;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    };
  } catch {
    console.warn(`[batch ${batchIndex + 1}] Could not parse LLM output as JSON — skipping batch`);
    return { nodes: [], edges: [], layers: [] };
  }
}

async function assembleGraph(fragments: GraphFragment[], projectName: string): Promise<KnowledgeGraph> {
  // Merge nodes (dedupe by id)
  const nodeMap = new Map<string, GraphNode>();
  for (const f of fragments) {
    for (const node of f.nodes) {
      if (!nodeMap.has(node.id)) nodeMap.set(node.id, node);
    }
  }

  // Merge edges (dedupe by source+target+type)
  const edgeSet = new Set<string>();
  const uniqueEdges: GraphEdge[] = [];
  for (const f of fragments) {
    for (const edge of f.edges) {
      const key = `${edge.source}→${edge.target}:${edge.type}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        uniqueEdges.push(edge);
      }
    }
  }

  // Merge layers
  const layerMap = new Map<string, Layer>();
  for (const f of fragments) {
    for (const layer of f.layers) {
      if (layerMap.has(layer.id)) {
        const existing = layerMap.get(layer.id)!;
        existing.nodeIds = [...new Set([...existing.nodeIds, ...layer.nodeIds])];
      } else {
        layerMap.set(layer.id, { ...layer });
      }
    }
  }

  // Ask LLM for project-level metadata
  const fileSample = [...nodeMap.keys()].filter((id) => id.includes(".")).slice(0, 50).join("\n");
  const metaText = await callLLM(
    `You are a technical writer. Given a list of file paths, identify the programming languages and frameworks used, and write a 1-2 sentence project description. Return ONLY valid JSON with no markdown: {"description": "...", "languages": [...], "frameworks": [...]}`,
    `Project: ${projectName}\nFiles:\n${fileSample}`,
  );

  let description = `${projectName} codebase`;
  let languages: string[] = [];
  let frameworks: string[] = [];
  try {
    const cleaned = metaText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const meta = JSON.parse(cleaned) as { description?: string; languages?: string[]; frameworks?: string[] };
    description = meta.description ?? description;
    languages = meta.languages ?? [];
    frameworks = meta.frameworks ?? [];
  } catch {
    // use defaults
  }

  return {
    version: "1.0.0",
    kind: "codebase",
    project: {
      name: projectName,
      languages,
      frameworks,
      description,
      analyzedAt: new Date().toISOString(),
      gitCommitHash: "",
    },
    nodes: [...nodeMap.values()],
    edges: uniqueEdges,
    layers: [...layerMap.values()],
    tour: [],
  };
}

export async function analyzeProject(
  files: ScannedFile[],
  projectName: string,
  _projectRoot: string,
  onProgress?: (current: number, total: number) => void,
): Promise<KnowledgeGraph> {
  const batches = chunkFiles(files);
  const fragments: GraphFragment[] = [];

  for (let i = 0; i < batches.length; i++) {
    onProgress?.(i + 1, batches.length + 1);
    const fragment = await analyzeBatch(batches[i], i, batches.length);
    fragments.push(fragment);
  }

  onProgress?.(batches.length + 1, batches.length + 1);
  const graph = await assembleGraph(fragments, projectName);

  const result = validateGraph(graph);
  if (result.success && result.data) return result.data as KnowledgeGraph;
  return graph;
}
