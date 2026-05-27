import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export async function serveDashboard(projectRoot: string, port = 3141): Promise<void> {
  const graphPath = join(projectRoot, ".codescape", "knowledge-graph.json");
  if (!existsSync(graphPath)) {
    throw new Error(`No graph found at ${graphPath}. Run 'codescape analyze' first.`);
  }

  // Find the dashboard dist directory (relative to this compiled file: cli/dist/serve.js → ../../packages/dashboard/dist)
  const distDir = join(dirname(fileURLToPath(import.meta.url)), "../../packages/dashboard/dist");

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const pathname = url.pathname;

    if (pathname === "/knowledge-graph.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(readFileSync(graphPath, "utf-8"));
      return;
    }

    // Serve static dashboard files
    let filePath = join(distDir, pathname === "/" ? "index.html" : pathname);
    if (!existsSync(filePath)) filePath = join(distDir, "index.html"); // SPA fallback
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(readFileSync(filePath));
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`\nDashboard: http://localhost:${port}`);
  console.log("Press Ctrl+C to stop.\n");

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      server.close();
      resolve();
    });
  });
}
