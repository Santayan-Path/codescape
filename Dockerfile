# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

# Copy manifests first so dependency install is cached independently of source
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/core/package.json   packages/core/
COPY packages/dashboard/package.json packages/dashboard/
COPY cli/package.json             cli/

RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY packages/core/   packages/core/
COPY packages/dashboard/ packages/dashboard/
COPY cli/             cli/
COPY tsconfig.json    ./

RUN pnpm build:core && pnpm build:cli && pnpm build:dashboard

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/core/dist/        packages/core/dist/
COPY --from=builder /app/packages/dashboard/dist/   packages/dashboard/dist/
COPY --from=builder /app/cli/dist/                  cli/dist/

# Copy package manifests (needed for module resolution)
COPY --from=builder /app/package.json               ./
COPY --from=builder /app/packages/core/package.json packages/core/
COPY --from=builder /app/packages/dashboard/package.json packages/dashboard/
COPY --from=builder /app/cli/package.json           cli/
COPY --from=builder /app/pnpm-workspace.yaml        ./

# Copy node_modules (shamefully-hoist puts everything at root)
COPY --from=builder /app/node_modules/              node_modules/

EXPOSE 3141

# Default: show help. Override with "analyze /project" or "serve /project"
ENTRYPOINT ["node", "/app/cli/dist/index.js"]
CMD ["--help"]
