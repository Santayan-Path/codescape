import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

// Serve knowledge-graph.json from GRAPH_DIR env var (or public/ fallback).
function graphPlugin(): Plugin {
  return {
    name: "codescape-graph",
    configureServer(server) {
      server.middlewares.use("/knowledge-graph.json", (_req, res) => {
        const graphDir = process.env.GRAPH_DIR
          ? resolve(process.env.GRAPH_DIR)
          : join(server.config.root, "public");
        const graphPath = join(graphDir, "knowledge-graph.json");
        if (!existsSync(graphPath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Graph not found at ${graphPath}` }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(readFileSync(graphPath));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), graphPlugin()],
  server: {
    port: 3141,
  },
});
