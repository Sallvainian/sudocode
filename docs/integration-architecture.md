# Integration Architecture

> Generated: 2026-03-21 | Type: Monorepo with 7 packages

## Inter-Package Communication

### types → all packages (TypeScript imports)

All packages import type definitions from `@sudocode-ai/types`. This package has no runtime dependencies — it only exports `.d.ts` files (except `schema.ts` and `migrations.ts` which have runtime exports).

### cli → server (direct imports)

The server imports CLI operations directly as a library:
```typescript
import { createSpec, listIssues, ... } from '@sudocode-ai/cli';
```

Services in `server/src/services/` use CLI operations for database access and entity management.

### cli → mcp (child_process)

The MCP server wraps CLI commands by spawning them as child processes:
```typescript
// mcp/src/server.ts
const result = execSync(`sudocode issue list --json`, { cwd: projectDir });
```

This provides process isolation and ensures the MCP server uses the same code paths as the CLI.

### frontend → server (REST API + WebSocket)

The frontend communicates with the server via:
- **REST API** — CRUD operations, execution management
- **WebSocket** — Real-time events (execution logs, status changes, entity updates)

API client uses **Axios** with **TanStack React Query** for caching and invalidation.

### server → agents (ACP + child_process)

The server spawns coding agents via the Agent Client Protocol:
```
server/src/execution/adapters/  → agent-execution-engine  → agent CLI process
```

Each agent type has an adapter that translates sudocode's execution model to the agent's CLI interface.

## Integration Points

```
┌──────────────┐
│   Frontend   │
│  (React SPA) │
└──────┬───────┘
       │ HTTP REST + WebSocket (ws://)
       │ Port: 3000 (default)
┌──────┴───────┐
│   Server     │
│  (Express)   │
├──────────────┤
│ ┌──────────┐ │     ┌──────────────────┐
│ │ CLI ops  │◄├─────┤  MCP Server      │
│ │ (import) │ │     │  (child_process) │
│ └──────────┘ │     └──────────────────┘
│ ┌──────────┐ │     ┌──────────────────┐
│ │ Agent    │─├────▶│  Agent Processes  │
│ │ adapters │ │ ACP │  (claude, codex)  │
│ └──────────┘ │     └──────────────────┘
│ ┌──────────┐ │     ┌──────────────────┐
│ │ Plugin   │─├────▶│  External Systems │
│ │ sync     │ │     │  (GitHub, Beads)  │
│ └──────────┘ │     └──────────────────┘
│ ┌──────────┐ │     ┌──────────────────┐
│ │ Watcher  │─├────▶│  File System     │
│ │ (chokidar│ │     │  (.sudocode/)    │
│ └──────────┘ │     └──────────────────┘
└──────────────┘
```

## Data Flow

### Creating an Execution

```
Frontend                    Server                      Git/Agent
   │                          │                            │
   ├─ POST /api/issues/:id/  ─┤                            │
   │  executions              │                            │
   │                          ├─ Create git worktree ──────┤
   │                          ├─ Spawn agent process ──────┤
   │                          │                            │
   │ ◄── WebSocket: status ───┤                            │
   │ ◄── WebSocket: logs ─────┤◄── stdout/stderr ─────────┤
   │                          │                            │
   │                          ├─ Capture after_commit ◄────┤
   │ ◄── WebSocket: complete ─┤                            │
   │                          │                            │
   ├─ GET /api/executions/   ─┤                            │
   │  :id/changes             ├─ git diff (before..after) ─┤
   │ ◄── File change stats ───┤                            │
```

### Syncing Entities

```
User edits .md file
       │
       ▼
  chokidar watcher (cli/src/watcher.ts)
       │
       ├─ Parse frontmatter (gray-matter)
       ├─ Extract cross-references ([[s-xxxx]])
       ├─ Update SQLite cache
       ├─ Export to JSONL (atomic write)
       │
       ▼
  WebSocket broadcast (server)
       │
       ▼
  Frontend invalidates React Query cache
       │
       ▼
  UI updates in real-time
```

### Integration Plugin Sync

```
External System (e.g., GitHub)
       │
       ▼
  Plugin Provider (searchEntities / getChangesSince)
       │
       ├─ mapToSudocode() — normalize to Spec/Issue
       ├─ Conflict resolution (newest-wins / sudocode-wins / manual)
       │
       ▼
  CLI operations (create/update spec or issue)
       │
       ├─ Set external_link on entity
       ├─ Export to JSONL
       │
       ▼
  Git commit (trackable change)
```

## Shared Dependencies

| Dependency | Used By | Purpose |
|-----------|---------|---------|
| `@sudocode-ai/types` | all packages | Type definitions |
| `better-sqlite3` | cli, server | SQLite database |
| `chokidar` | cli, plugins | File watching |
| `zod` | server, frontend | Schema validation |
| `vitest` | all packages | Testing |
| `typescript` | all packages | Compilation |
| `agent-execution-engine` | server | Agent process management |
| `@modelcontextprotocol/sdk` | mcp, server | MCP protocol |

## Multi-Project Support

The server supports managing multiple sudocode projects simultaneously:
- `ProjectRegistry` tracks active projects
- `ProjectManager` handles project switching
- `project-context` middleware injects project context per request
- WebSocket messages include project identification
- Frontend uses `ProjectContext` to scope all operations
