import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import ignore from "ignore";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".swift", ".cpp", ".c", ".cs", ".php",
  ".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".env",
  ".sql", ".graphql", ".proto", ".sh", ".bash",
  ".html", ".css", ".scss",
  "Dockerfile", "Makefile", ".gitignore",
]);

const ALWAYS_SKIP = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  ".codescape", ".understand-anything", "coverage", "__pycache__",
  ".venv", "venv", ".cache", "vendor",
]);

export interface ScannedFile {
  path: string;       // relative to projectRoot
  content: string;
  extension: string;
  sizeBytes: number;
}

function buildIgnore(projectRoot: string): ReturnType<typeof ignore> {
  const ig = ignore();
  const gitignorePath = join(projectRoot, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

function isTextFile(fileName: string): boolean {
  const ext = extname(fileName);
  return ext ? TEXT_EXTENSIONS.has(ext) : TEXT_EXTENSIONS.has(fileName);
}

export function scanProject(projectRoot: string, options?: { maxFileSizeKb?: number; maxFiles?: number }): ScannedFile[] {
  const maxBytes = (options?.maxFileSizeKb ?? 100) * 1024;
  const maxFiles = options?.maxFiles ?? 500;
  const ig = buildIgnore(projectRoot);
  const files: ScannedFile[] = [];

  function walk(dir: string): void {
    if (files.length >= maxFiles) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (ALWAYS_SKIP.has(entry)) continue;
      const fullPath = join(dir, entry);
      const relPath = relative(projectRoot, fullPath);
      if (ig.ignores(relPath)) continue;

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && isTextFile(entry) && stat.size <= maxBytes) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          files.push({ path: relPath, content, extension: extname(entry), sizeBytes: stat.size });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(projectRoot);
  return files;
}
