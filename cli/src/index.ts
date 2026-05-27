#!/usr/bin/env node
import { Command } from "commander";
import { basename, resolve } from "node:path";
import ora from "ora";
import { scanProject } from "./scanner.js";
import { analyzeProject } from "./analyze.js";
import { saveGraph, saveMeta } from "@codescape/core";
import { serveDashboard } from "./serve.js";

const program = new Command();

program
  .name("codescape")
  .description("Analyze any codebase or document set and explore it as an interactive knowledge graph")
  .version("0.1.0");

program
  .command("analyze [path]")
  .description("Analyze a project and produce a knowledge graph")
  .option("-o, --open", "Open the dashboard after analysis")
  .option("--max-files <n>", "Maximum files to scan", "500")
  .option("--max-file-size <kb>", "Maximum file size in KB", "100")
  .action(async (targetPath: string | undefined, opts: { open?: boolean; maxFiles: string; maxFileSize: string }) => {
    const projectRoot = resolve(targetPath ?? ".");
    const projectName = basename(projectRoot);

    console.log(`\nAnalyzing ${projectName}...\n`);

    const scanSpinner = ora("Scanning files").start();
    const files = scanProject(projectRoot, {
      maxFiles: parseInt(opts.maxFiles),
      maxFileSizeKb: parseInt(opts.maxFileSize),
    });
    scanSpinner.succeed(`Found ${files.length} files`);

    if (files.length === 0) {
      console.error("No files found. Check the path and try again.");
      process.exit(1);
    }

    const analyzeSpinner = ora("Analyzing with AI (this may take a minute)").start();

    const graph = await analyzeProject(files, projectName, projectRoot, (current, total) => {
      analyzeSpinner.text = `Analyzing batch ${current}/${total}`;
    });

    analyzeSpinner.succeed(`Analyzed ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    const saveSpinner = ora("Saving graph").start();
    saveGraph(projectRoot, graph);
    saveMeta(projectRoot, {
      lastAnalyzedAt: new Date().toISOString(),
      gitCommitHash: "",
      version: "1.0.0",
      analyzedFiles: files.length,
    });
    saveSpinner.succeed(`Saved to .codescape/knowledge-graph.json`);

    if (opts.open) {
      await serveDashboard(projectRoot);
    } else {
      console.log(`\nRun 'codescape serve ${targetPath ?? "."}' to open the dashboard.\n`);
    }
  });

program
  .command("serve [path]")
  .description("Serve the dashboard for an analyzed project")
  .option("-p, --port <n>", "Port to listen on", "3141")
  .action(async (targetPath: string | undefined, opts: { port: string }) => {
    const projectRoot = resolve(targetPath ?? ".");
    await serveDashboard(projectRoot, parseInt(opts.port));
  });

program.parse();
