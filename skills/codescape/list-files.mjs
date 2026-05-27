#!/usr/bin/env node
/**
 * list-files.mjs <projectRoot>
 *
 * Scans a project directory and prints a JSON array of relative file paths to stdout.
 * Used by the /codescape skill so Claude can read files in batches.
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".cpp", ".c", ".cs", ".php",
  ".md", ".txt", ".yaml", ".yml", ".json", ".toml",
  ".sql", ".graphql", ".proto", ".sh", ".bash",
  ".html", ".css", ".scss",
]);

const ALWAYS_SKIP = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  ".codescape", ".understand-anything", "coverage", "__pycache__",
  ".venv", "venv", ".cache", "vendor",
]);

const projectRoot = process.argv[2];
if (!projectRoot) {
  console.error("Usage: list-files.mjs <projectRoot>");
  process.exit(1);
}

const maxBytes = 100 * 1024; // 100 KB
const maxFiles = parseInt(process.argv[3] ?? "500");

// Build ignore filter from .gitignore if present
let ig = null;
try {
  const ignore = require("ignore");
  ig = ignore();
  const gitignorePath = join(projectRoot, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }
} catch {
  // ignore package not available — skip gitignore filtering
}

const files = [];

function walk(dir) {
  if (files.length >= maxFiles) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    if (files.length >= maxFiles) break;
    if (ALWAYS_SKIP.has(entry)) continue;

    const fullPath = join(dir, entry);
    const relPath = relative(projectRoot, fullPath);

    if (ig?.ignores(relPath)) continue;

    let stat;
    try { stat = statSync(fullPath); } catch { continue; }

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (stat.isFile() && stat.size <= maxBytes) {
      const ext = extname(entry);
      if (TEXT_EXTENSIONS.has(ext)) {
        files.push(relPath);
      }
    }
  }
}

walk(projectRoot);
console.log(JSON.stringify(files));
