# Project Overview

> Generated: 2026-03-21 | Version: 0.2.0

## Summary

**sudocode** is a git-native context management system for AI-assisted software development. It provides a structured 4-tiered abstraction for managing the full lifecycle of AI coding agent work:

1. **Spec** (`s-xxxx`) — User intent and requirements (WHAT you want)
2. **Issue** (`i-xxxx`) — Agent-scoped work items (tasks within agent scope)
3. **Execution** — Agent run trajectory (HOW it was executed)
4. **Artifact** — Code diffs and output (Results)

**Core Value Proposition:** Treats context as code — git-tracked, distributed, mergeable.

## Repository Type

**Monorepo** using npm workspaces with 7 packages and 4 integration plugins.

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | TypeScript | ^5.3.3 |
| Runtime | Node.js | >= 18.0.0 |
| Package Manager | npm workspaces | — |
| Build (backend) | tsc | — |
| Build (frontend) | Vite | ^6.4.1 |
| Build (binaries) | esbuild + Node.js SEA | — |
| Test Framework | Vitest | ^3.2.4 |
| E2E Testing | Playwright | ^1.57.0 |
| Frontend Framework | React | ^18.2.0 |
| CSS Framework | TailwindCSS | ^3.4.0 |
| Component Library | Radix UI (shadcn/ui pattern) | — |
| State Management | Zustand + TanStack React Query | — |
| HTTP Server | Express | ^4.18.2 |
| WebSocket | ws | ^8.18.3 |
| Database | SQLite (better-sqlite3) | ^11.10.0 |
| CLI Framework | Commander.js | ^13.1.0 |
| MCP SDK | @modelcontextprotocol/sdk | ^1.0.4 |
| Agent Execution | agent-execution-engine, ACP SDK | — |
| File Watching | chokidar | ^4.0.3 |
| Markdown Parsing | gray-matter | ^4.0.3 |
| Diff Rendering | @git-diff-view/react | — |
| Rich Text Editor | Tiptap | ^3.8.0 |
| Graph Visualization | @xyflow/react (React Flow) | ^12.9.3 |
| Schema Validation | Zod | ^3.22.4 |

## Architecture Pattern

**Layered monorepo with shared types:**

- **types** — Foundation layer (type definitions, schema, migrations)
- **cli** — Operations layer (CRUD, storage, sync)
- **mcp** — AI integration layer (wraps CLI for MCP protocol)
- **server** — Service layer (REST API, WebSocket, execution engine)
- **frontend** — Presentation layer (React SPA)
- **plugins** — Extension layer (external system integrations)

## Supported AI Agents

| Agent | Type | Protocol |
|-------|------|----------|
| Claude Code | `claude-code` | ACP (native) |
| Codex | `codex` | ACP (native) |
| Gemini | `gemini` | ACP (native) |
| Opencode | `opencode` | ACP (native) |
| GitHub Copilot | `copilot` | ACP (via shim) |
| Cursor | `cursor` | ACP (via shim) |

## Storage Architecture

```
Markdown Files (.sudocode/specs/*.md, .sudocode/issues/*.md)
    ↕ (syncs via watcher)
JSONL Files (specs.jsonl, issues.jsonl) ← git-tracked, source of truth
    ↕ (import/export)
SQLite Cache (cache.db) ← QUERY ENGINE (gitignored, rebuilt from JSONL)
```

**Key Principles:**
- Configurable source of truth (JSONL default, markdown optional)
- JSONL always exported for git tracking
- SQLite is a disposable query cache (gitignored, rebuilt after `git pull`)
- Markdown is the human interface (editable with any text editor)
- Git handles distribution — AI handles merge conflicts

## Database Schema

11 tables across the SQLite cache:

| Table | Purpose |
|-------|---------|
| `specs` | Spec metadata and content |
| `issues` | Issue metadata, status, assignee |
| `relationships` | Entity relationships (blocks, implements, etc.) |
| `tags` | Entity tags |
| `events` | Audit event log |
| `issue_feedback` | Anchored feedback (polymorphic: issue→spec or issue→issue) |
| `executions` | Execution lifecycle, git info, workflow fields |
| `execution_logs` | Raw and normalized execution output |
| `prompt_templates` | Reusable prompt templates |
| `workflows` | Multi-issue workflow orchestration |
| `workflow_events` | Workflow lifecycle events |

Plus 2 views: `ready_issues`, `blocked_issues`

## Key Features

- **Multi-agent execution** — Run any supported coding agent on any issue
- **Worktree isolation** — Each execution gets an isolated git worktree
- **Execution chains** — Follow-up executions linked via `parent_execution_id`
- **Workflow orchestration** — Multi-issue automation with dependency DAGs
- **Real-time monitoring** — WebSocket-based execution log streaming
- **Code change tracking** — Committed + uncommitted diff visualization
- **Worktree sync** — Squash, preserve, or stage changes back to main
- **Integration plugins** — GitHub, Beads, OpenSpec, SpecKit integrations
- **Voice support** — STT/TTS for voice-driven interaction
- **MCP server** — AI agents can manage specs/issues via MCP protocol
- **Cross-references** — `[[s-abc123]]`, `[[@i-xyz]]` wiki-style links in markdown
- **Anchored feedback** — Line-level feedback with smart relocation
- **Multi-project** — Server supports managing multiple sudocode projects

## License

Apache-2.0
