# sudocode — Project Documentation Index

> Generated: 2026-03-22 | Version: 0.2.0 | Scan Level: Exhaustive

## Project Overview

- **Type:** Monorepo (npm workspaces) with 7 packages + 5 plugins
- **Primary Language:** TypeScript
- **Architecture:** Layered monorepo (types → cli → mcp/server → frontend)
- **License:** Apache-2.0

### Quick Reference

| Package | Type | Description |
|---------|------|-------------|
| **types** | Library | Shared TypeScript definitions (`@sudocode-ai/types`) |
| **cli** | CLI | Core operations, storage, sync (`@sudocode-ai/cli`) |
| **mcp** | Backend | MCP server for AI agents (`@sudocode-ai/mcp`) |
| **server** | Backend | Express REST API + WebSocket (`@sudocode-ai/local-server`) |
| **frontend** | Web | React SPA with Vite + TailwindCSS (`@sudocode-ai/local-ui`) |
| **sudocode** | Meta | Bundles all packages |
| **plugins** | Library | 5 integrations: BMAD, Beads, GitHub, OpenSpec, Spec-Kit |

### Key Metrics

| Metric | Value |
|--------|-------|
| Source Files | 350+ |
| Database Tables | 11 + 2 views |
| REST Endpoints | 80+ |
| MCP Tools | 32 across 11 scopes |
| CLI Commands | 27+ |
| React Components | 100+ |
| Custom Hooks | 37+ |
| Agent Types | 6 (claude-code, codex, copilot, cursor, gemini, opencode) |
| Integration Plugins | 5 |
| Color Themes | 9 |

## Generated Documentation

- [Project Overview](./project-overview.md) — Executive summary, tech stack, key features, distribution
- [Architecture](./architecture.md) — System architecture, storage, execution engine, workflows, BMAD
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree with all 350+ files
- [Data Models](./data-models-generated.md) — Entity schemas, relationships, ID generation, JSONL format
- [API Contracts](./api-contracts.md) — REST endpoints, CLI commands, MCP tools, WebSocket API
- [Component Inventory](./component-inventory.md) — Frontend pages, components, hooks, contexts
- [Integration Architecture](./integration-architecture.md) — Inter-package communication, plugin system, data flow
- [Development Guide](./development-guide.md) — Build, test, dev setup, CI/CD, binary distribution

## Existing Documentation

These documents were found in the repository before this scan:

- [Overview](./overview.md) — Original project overview
- [CLI Documentation](./cli.md) — CLI command reference
- [MCP Documentation](./mcp.md) — MCP server reference
- [Data Model](./data-model.md) — Original data model docs
- [Storage Architecture](./storage.md) — Storage layer details
- [Feedback Mechanisms](./feedback-mechanisms.md) — Feedback system design
- [TODO / Roadmap](./todo.md) — Project roadmap

### Spec Documents

- [Markdown Source of Truth](./specs/markdown-source-of-truth.md) — Spec for markdown-first mode
- [Markdown SoT Implementation](./specs/markdown-source-of-truth-implementation.md) — Implementation details

## BMAD Integration Review

Detailed review findings from the BMAD integration (5 reviews, 27 issues):

- [Master Fix List](../review/00-master-fix-list.md) — 5 critical, 10 important, 12+ minor issues
- [Plugin Core Review](../review/01-plugin-core-review.md) — Interface compliance, missing validate()
- [Parser & Sync Review](../review/02-parser-sync-review.md) — Watcher issues, YAML formatting loss
- [Server Review](../review/03-server-review.md) — Route patterns, persona key mismatch
- [Frontend Review](../review/04-frontend-review.md) — Duplicate axios, missing WebSocket
- [MCP & Persona Review](../review/05-mcp-persona-review.md) — Wrong endpoint routing, phase mapping
- [Documentation Inventory](../review/documentation-inventory.md) — External docs reference (57 pages on docs.sudocode.ai)

## External Documentation

- **docs.sudocode.ai** — Full user-facing documentation (57 pages)
  - CLI (27 pages): All commands with examples
  - Concepts (5 pages): Specs, Issues, Relationships, Feedback, Storage
  - MCP (7 pages): Tool reference, agent best practices
  - Web UI (4 pages): Overview, quickstart, management
  - Examples (5 pages): Workflows, spec-driven dev, debugging
  - General (4 pages): Introduction, quickstart, roadmap

## Getting Started

### For Development
```bash
git clone https://github.com/sudocode-ai/sudocode.git
cd sudocode
npm install
npm run build
npm run dev:server    # Server with hot reload on :3000
npm run dev:frontend  # Vite dev server
```

### For AI-Assisted Feature Work
1. Start with [Architecture](./architecture.md) for system understanding
2. Check [API Contracts](./api-contracts.md) for available endpoints
3. Review [Component Inventory](./component-inventory.md) for reusable UI
4. See [Integration Architecture](./integration-architecture.md) for data flow
5. Consult [Data Models](./data-models-generated.md) for schema details

### For BMAD Integration Work
1. Review [Master Fix List](../review/00-master-fix-list.md) for known issues
2. Check [Integration Architecture](./integration-architecture.md) for BMAD layers
3. See [Architecture](./architecture.md) § BMAD Integration for persona system
