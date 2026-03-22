# sudocode — Project Documentation Index

> Generated: 2026-03-21 | Version: 0.2.0 | Scan Level: Exhaustive

## Project Overview

- **Type:** Monorepo (npm workspaces) with 7 packages + 4 plugins
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
| **plugins** | Library | GitHub, Beads, OpenSpec, SpecKit integrations |

## Generated Documentation

- [Project Overview](./project-overview.md) — Executive summary, tech stack, key features
- [Architecture](./architecture.md) — System architecture, storage, execution, workflows
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree with all files
- [Data Models](./data-models-generated.md) — Entity schemas, relationships, ID generation
- [API Contracts](./api-contracts.md) — REST endpoints, MCP tools, CLI commands
- [Component Inventory](./component-inventory.md) — Frontend components, pages, hooks
- [Integration Architecture](./integration-architecture.md) — Inter-package communication, data flow
- [Development Guide](./development-guide.md) — Build, test, dev setup, CI/CD

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

## Getting Started

### For New Contributors

1. Read [Project Overview](./project-overview.md) for the big picture
2. Read [Architecture](./architecture.md) for system design
3. Read [Development Guide](./development-guide.md) for setup instructions
4. Browse [Source Tree Analysis](./source-tree-analysis.md) to find your way around

### For Feature Development

- **Full-stack features:** Read [Architecture](./architecture.md) + [Integration Architecture](./integration-architecture.md)
- **Frontend work:** Read [Component Inventory](./component-inventory.md)
- **API changes:** Read [API Contracts](./api-contracts.md)
- **Data model changes:** Read [Data Models](./data-models-generated.md)
- **Plugin development:** Read [Integration Architecture](./integration-architecture.md)

### For Brownfield PRD

Point the PRD workflow to this index: `docs/index.md`
