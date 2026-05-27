import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, isAbsolute, relative, basename } from "node:path";
import type { KnowledgeGraph, AnalysisMeta } from "./types.js";
import { validateGraph } from "./schema.js";

const CS_DIR = ".codescape";
const GRAPH_FILE = "knowledge-graph.json";
const META_FILE = "meta.json";

function ensureDir(projectRoot: string): string {
  const dir = join(projectRoot, CS_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitiseFilePaths(graph: KnowledgeGraph, projectRoot: string): KnowledgeGraph {
  const normalRoot = projectRoot.endsWith("/") ? projectRoot : projectRoot + "/";
  const sanitisedNodes = graph.nodes.map((node) => {
    if (typeof node.filePath !== "string") return node;
    const fp = node.filePath;
    if (!isAbsolute(fp)) return node;
    if (fp.startsWith(normalRoot) || fp.startsWith(projectRoot)) return { ...node, filePath: relative(projectRoot, fp) };
    return { ...node, filePath: basename(fp) };
  });
  return { ...graph, nodes: sanitisedNodes };
}

export function saveGraph(projectRoot: string, graph: KnowledgeGraph): void {
  const dir = ensureDir(projectRoot);
  const sanitised = sanitiseFilePaths(graph, projectRoot);
  writeFileSync(join(dir, GRAPH_FILE), JSON.stringify(sanitised, null, 2), "utf-8");
}

export function loadGraph(projectRoot: string, options?: { validate?: boolean }): KnowledgeGraph | null {
  const filePath = join(projectRoot, CS_DIR, GRAPH_FILE);
  if (!existsSync(filePath)) return null;
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  if (options?.validate !== false) {
    const result = validateGraph(data);
    if (!result.success) throw new Error(`Invalid knowledge graph: ${result.fatal ?? "unknown error"}`);
    return result.data as KnowledgeGraph;
  }
  return data as KnowledgeGraph;
}

export function saveMeta(projectRoot: string, meta: AnalysisMeta): void {
  const dir = ensureDir(projectRoot);
  writeFileSync(join(dir, META_FILE), JSON.stringify(meta, null, 2), "utf-8");
}

export function loadMeta(projectRoot: string): AnalysisMeta | null {
  const filePath = join(projectRoot, CS_DIR, META_FILE);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as AnalysisMeta;
}

export function getGraphPath(projectRoot: string): string {
  return join(projectRoot, CS_DIR, GRAPH_FILE);
}
