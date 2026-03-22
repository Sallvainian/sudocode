# Architecture

> Generated: 2026-03-21 | Type: Monorepo (npm workspaces)

## Executive Summary

sudocode is a git-native context management system built as a TypeScript monorepo. It provides a layered architecture where shared types form the foundation, a CLI provides core operations, and server/frontend packages deliver a full web experience. The system treats AI coding agent context (specs, issues, executions) as first-class git artifacts.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React SPA)                      │
│   Pages: Executions, Issues, Specs, Workflows, Worktrees         │
│   Stack: React 18 + Vite + TailwindCSS + Radix UI + Zustand     │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────┴────────────────────────────────────────┐
│                     Server (Express + ws)                        │
│   Routes: /api/executions, /api/issues, /api/workflows, ...     │
│   Services: execution-service, agent-registry, worktree-sync    │
│   Execution Engine: agent adapters (ACP), worker pool            │
│   Workflow Engine: sequential + orchestrator (AI-driven)         │
└────────────┬───────────────────────────┬────────────────────────┘
             │ imports                   │ child_process
┌────────────┴──────────┐  ┌────────────┴─────────────────────────┐
│     CLI (Commander)    │  │        MCP Server (stdio)             │
│  Operations: CRUD      │  │  Tools: ready, list_issues,          │
│  Storage: JSONL+SQLite │  │    show_spec, upsert_issue,          │
│  Sync: watcher         │  │    link, add_feedback                 │
│  Merge: git drivers    │  │  Wraps CLI via child_process         │
└────────────┬──────────┘  └───────────────────────────────────────┘
             │ imports
┌────────────┴──────────┐
│   Types (definitions)  │
│  Entities, Schema,     │
│  Migrations, Agents,   │
│  Workflows, Voice      │
└────────────────────────┘
```

## Storage Architecture

### Three-Layer Storage

1. **Markdown files** (`.sudocode/specs/*.md`, `.sudocode/issues/*.md`)
   - Human-editable, frontmatter + content
   - Can be authoritative (`sourceOfTruth: "markdown"`)

2. **JSONL files** (`specs.jsonl`, `issues.jsonl`)
   - Git-tracked, one JSON object per line
   - Default source of truth
   - Sorted by `created_at` to minimize merge conflicts
   - Atomic writes via temp file + rename

3. **SQLite cache** (`cache.db`)
   - Gitignored, rebuilt from JSONL
   - Query engine with indexes and views
   - WAL mode for concurrent access

### Sync Flow

```
User edits .md → watcher detects → parse frontmatter → update JSONL → update SQLite
CLI updates DB → debounced export → update JSONL → update .md
Git pull → JSONL changed → import → rebuild SQLite
```

## Execution Architecture

### Agent Execution Lifecycle

```
1. User creates execution (via UI or API)
   ↓
2. Server creates git worktree (isolated branch)
   ↓
3. Agent adapter spawns agent process (ACP protocol)
   ↓
4. Real-time log streaming via WebSocket
   ↓
5. Agent completes → capture after_commit
   ↓
6. User syncs changes (squash/preserve/stage)
```

### Agent Client Protocol (ACP)

All agents are integrated via the Agent Client Protocol:
- **Native ACP:** claude-code, codex, gemini, opencode
- **ACP via shim:** copilot, cursor

The `agent-execution-engine` package provides:
- Standardized process spawning
- Normalized log output (NormalizedEntry format)
- Execution lifecycle management

### Worktree Isolation

Each execution gets an isolated git worktree:
- Branch: `sudocode/exec-{id}`
- Parallel execution without conflicts
- Auto-cleanup on completion (configurable)
- Orphaned worktree cleanup on server startup

### Sync Modes

Four strategies for merging worktree changes back:
1. **Preview** — Non-destructive diff/conflict analysis
2. **Squash** — Combine all commits into one on target branch
3. **Preserve** — Merge with full commit history
4. **Stage** — Apply changes to working directory without committing

JSONL conflicts are auto-resolved via three-way merge. Safety snapshots via git tags.

## Workflow Architecture

### Sequential Engine
Server-managed step execution following dependency order:
- Topological sort of issue dependency graph
- One step at a time (or configurable concurrency)
- Auto-commit after each step

### Orchestrator Engine
AI agent orchestrates workflow dynamically:
- Orchestrator agent gets MCP tools for workflow management
- Event-driven wakeup system (batched events)
- Human-in-the-loop escalation support
- Autonomy levels: `full_auto` or `human_in_the_loop`

## Integration Architecture

### Plugin System

Plugins implement the `IntegrationPlugin` interface:
- `validateConfig()` — Validate plugin configuration
- `testConnection()` — Test external system connectivity
- `createProvider()` — Create sync provider instance

Providers implement `IntegrationProvider`:
- Entity CRUD in external system
- Change detection (polling or watching)
- Field mapping (external ↔ sudocode)
- On-demand import via URL

### Current Plugins

| Plugin | External System | Capabilities |
|--------|----------------|--------------|
| `integration-github` | GitHub Issues/PRs | Import, sync, search via `gh` CLI |
| `integration-beads` | Beads | File watching, sync |
| `integration-openspec` | OpenSpec | File watching, sync |
| `integration-speckit` | SpecKit | File watching, sync |

## Real-Time Communication

### WebSocket Events

The server broadcasts events via WebSocket for real-time UI updates:
- Execution status changes
- Log streaming (NDJSON)
- Entity sync events (spec/issue created/updated)
- Workflow step transitions
- Voice narration events

### Project-Aware Messaging

WebSocket messages include project context, allowing the frontend to filter events by active project in multi-project mode.

## Voice Architecture

Optional STT/TTS support:
- **STT providers:** whisper-local (local server), OpenAI
- **TTS providers:** browser (Web Speech API), Kokoro (local/WASM), OpenAI
- **Streaming TTS:** WebSocket-based audio chunk streaming
- **Narration:** Event-driven narration of execution progress

## Security Considerations

- SQLite uses WAL mode with `PRAGMA foreign_keys=ON`
- Worktrees provide process isolation between executions
- `restrictToWorkDir` option blocks file operations outside working directory
- Credentials managed via fnox (no hardcoded secrets)
- Integration plugin configs support conflict resolution strategies
