#!/usr/bin/env node
/**
 * save-graph.mjs <projectRoot>
 *
 * Reads a knowledge graph JSON from stdin, validates it, and writes it to
 * <projectRoot>/.codescape/knowledge-graph.json + meta.json.
 *
 * Exit codes:
 *   0 — success
 *   1 — validation fatal error
 *   2 — JSON parse error
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, isAbsolute, relative, basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const projectRoot = process.argv[2];
if (!projectRoot) {
  console.error("Usage: save-graph.mjs <projectRoot>");
  process.exit(1);
}

const CS_DIR = join(projectRoot, ".codescape");
if (!existsSync(CS_DIR)) mkdirSync(CS_DIR, { recursive: true });

// Read JSON from stdin
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const raw = Buffer.concat(chunks).toString("utf-8");

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("save-graph: JSON parse error:", err.message);
    process.exit(2);
  }

  // Try to load and validate using @codescape/core if built
  let validated = data;
  try {
    // Find core dist relative to plugin root (two dirs up from skills/codescape/)
    const pluginRoot = join(import.meta.dirname, "../..");
    const schemaPath = join(pluginRoot, "packages/core/dist/schema.js");
    if (existsSync(schemaPath)) {
      const { validateGraph } = await import(schemaPath);
      const result = validateGraph(data);
      if (!result.success) {
        console.error("save-graph: validation failed:", result.fatal);
        process.exit(1);
      }
      validated = result.data;
      if (result.issues.length > 0) {
        console.warn(`save-graph: ${result.issues.length} auto-corrected issue(s)`);
      }
    }
  } catch {
    // schema not available — save as-is
  }

  // Sanitise absolute file paths
  if (Array.isArray(validated.nodes)) {
    const normalRoot = projectRoot.endsWith("/") ? projectRoot : projectRoot + "/";
    validated = {
      ...validated,
      nodes: validated.nodes.map((node) => {
        if (typeof node.filePath !== "string") return node;
        const fp = node.filePath;
        if (!isAbsolute(fp)) return node;
        if (fp.startsWith(normalRoot) || fp.startsWith(projectRoot)) return { ...node, filePath: relative(projectRoot, fp) };
        return { ...node, filePath: basename(fp) };
      }),
    };
  }

  writeFileSync(join(CS_DIR, "knowledge-graph.json"), JSON.stringify(validated, null, 2), "utf-8");

  // Write meta.json
  const meta = {
    lastAnalyzedAt: new Date().toISOString(),
    gitCommitHash: "",
    version: "1.0.0",
    analyzedFiles: validated.nodes?.length ?? 0,
  };
  writeFileSync(join(CS_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");

  console.log(`Saved: ${join(CS_DIR, "knowledge-graph.json")}`);
  console.log(`Nodes: ${validated.nodes?.length ?? 0}, Edges: ${validated.edges?.length ?? 0}`);
});
