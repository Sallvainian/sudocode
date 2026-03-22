# Integration Architecture

> Generated: 2026-03-22 | Scan Level: Exhaustive

## Package Dependency Chain

```
┌────────────┐
│   types    │  Foundation: .d.ts files + schema.ts + migrations.ts
└─────┬──────┘
      │ direct import
      v
┌────────────┐
│    cli     │  Operations: CRUD, storage, sync, JSONL, markdown
└──┬──────┬──┘
   │      │
   │      │ direct function imports
   │      v
   │  ┌────────────┐     ┌──────────────────┐
   │  │   server   │────>│  Agent Processes  │
   │  │  (Express) │ ACP │  (6 agent types)  │
   │  └─────┬──────┘     └──────────────────┘
   │        │
   │        │ REST API + WebSocket
   │        v
   │  ┌────────────┐
   │  │  frontend  │  React SPA (independent build)
   │  └────────────┘
   │
   │ child_process (CLI subprocess)
   v
┌────────────┐
│    mcp     │  MCP server: wraps CLI for AI agents
└────────────┘

┌────────────┐
│  plugins   │  5 integration plugins (loaded dynamically by CLI)
└────────────┘
```

## 5 Integration Points

### 1. types -> cli (Direct TypeScript Import)

All packages import type definitions from `@sudocode-ai/types`. This package has no runtime dependencies -- it only exports `.d.ts` files (except `schema.ts` and `migrations.ts` which have runtime exports for SQLite table creation and migration logic).

```typescript
import type { Spec, Issue, Relationship } from '@sudocode-ai/types';
```

### 2. cli -> mcp (CLI Subprocess Spawning)

The MCP server wraps CLI commands by spawning them as child processes with JSON output parsing:

```typescript
// mcp/src/server.ts
const result = execSync(`sudocode issue list --json`, { cwd: projectDir });
const issues = JSON.parse(result.toString());
```

This provides process isolation and ensures the MCP server uses the same code paths as the CLI. The MCP server does not directly import CLI functions -- it invokes them as subprocesses and parses their JSON stdout.

### 3. cli -> server (Direct Function Imports)

The server imports CLI operations directly as a library for CRUD operations:

```typescript
import { createSpec, listIssues, updateIssue, ... } from '@sudocode-ai/cli';
```

Services in `server/src/services/` use CLI operations for database access and entity management. This is the tightest coupling in the monorepo -- the server depends on the CLI's internal API.

### 4. server -> frontend (REST API + WebSocket)

The frontend communicates with the server via two channels:

- **REST API** -- CRUD operations, execution management, code changes, sync operations
- **WebSocket** -- Real-time events (execution logs, status changes, entity updates)

API client uses **Axios** with **TanStack React Query** for caching and invalidation.

**Project scoping:** Multi-project support is implemented via an `X-Project-ID` header. The server's `project-context` middleware injects project context per request. WebSocket messages include project identification for filtering.

### 5. plugins -> cli (Integration Provider Interface)

Plugins are loaded dynamically by the CLI's plugin-loader and orchestrated by the sync-coordinator:

```
IntegrationPlugin (factory)
    │
    │ createProvider(options, projectPath)
    v
IntegrationProvider (runtime instance)
    │
    │ registered with
    v
SyncCoordinator (orchestrator)
    │
    │ calls initialize(), fetchEntity(), searchEntities(),
    │ getChangesSince(), mapToSudocode(), mapFromSudocode(),
    │ startWatching(), stopWatching()
    v
CLI operations (createSpec, updateIssue, etc.)
```

## Plugin Architecture

### IntegrationPlugin (Factory Interface)

Every plugin must export an object implementing `IntegrationPlugin`:

| Method | Required | Purpose |
|--------|----------|---------|
| `name` | Yes | Unique plugin identifier |
| `displayName` | Yes | Human-readable name |
| `version` | Yes | Plugin version |
| `description` | No | Plugin description |
| `configSchema` | No | JSON Schema for UI form generation |
| `validateConfig(options)` | Yes | Validate plugin options |
| `testConnection(options, projectPath)` | Yes | Test plugin setup |
| `createProvider(options, projectPath)` | Yes | Create provider instance |

### IntegrationProvider (Runtime Interface)

Created by `IntegrationPlugin.createProvider()`. Each provider declares its capabilities:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Provider name (matches plugin) |
| `supportsWatch` | `boolean` | Real-time file/event watching |
| `supportsPolling` | `boolean` | Polling for changes |
| `supportsOnDemandImport` | `boolean` | URL-based import |
| `supportsSearch` | `boolean` | Search operations |
| `supportsPush` | `boolean` | Push changes to external system |

**Required methods:**

| Method | Purpose |
|--------|---------|
| `initialize()` | One-time setup |
| `dispose()` | Cleanup resources |
| `fetchEntity(externalId)` | Fetch single entity |
| `searchEntities(query?, options?)` | Search entities |
| `createEntity(entity)` | Create in external system |
| `updateEntity(externalId, entity)` | Update in external system |
| `getChangesSince(timestamp)` | Get changes for polling |
| `mapToSudocode(external)` | Map external -> sudocode |
| `mapFromSudocode(entity)` | Map sudocode -> external |

**Optional methods:**

| Method | Purpose |
|--------|---------|
| `startWatching(callback)` | Start real-time watching |
| `stopWatching()` | Stop watching |
| `deleteEntity(externalId)` | Delete in external system |
| `validate()` | Validate provider state |

### SyncCoordinator (Orchestrator)

The `SyncCoordinator` in `cli/src/integrations/sync-coordinator.ts` orchestrates all provider operations:

1. Loads plugins via plugin-loader
2. Calls `provider.validate()` at startup
3. Manages watch/poll/push cycles
4. Handles conflict resolution (newest-wins, sudocode-wins, external-wins, manual)
5. Routes ExternalChanges to CLI operations (create/update spec or issue)
6. Maintains external_link records on entities

## Configuring Integrations (User Guide)

Integration plugins are configured in `.sudocode/config.json` under the `integrations` key. This file is git-tracked, so integration settings are shared across the team.

### Basic Configuration

```json
{
  "sourceOfTruth": "jsonl",
  "integrations": {
    "bmad": {
      "enabled": true,
      "auto_sync": true,
      "options": {
        "path": "_bmad-output"
      }
    }
  }
}
```

### Configuration Fields

Every provider entry supports these fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `plugin` | `string` | auto-resolved | npm package or local path. First-party plugins (bmad, beads, openspec, speckit, github) resolve automatically. |
| `enabled` | `boolean` | — | Whether the integration is active |
| `auto_sync` | `boolean` | `false` | Automatically sync changes on file watch events |
| `default_sync_direction` | `string` | `"bidirectional"` | `"inbound"`, `"outbound"`, or `"bidirectional"` |
| `conflict_resolution` | `string` | `"manual"` | `"newest-wins"`, `"sudocode-wins"`, `"external-wins"`, or `"manual"` |
| `auto_import` | `boolean` | `true` | Auto-import new entities from external system |
| `delete_behavior` | `string` | `"close"` | `"close"` (close linked issue), `"delete"` (hard delete), or `"ignore"` |
| `options` | `object` | — | Plugin-specific options (see per-plugin tables below) |

### Per-Plugin Options

#### BMAD (`"bmad"`)

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `path` | Yes | — | Path to `_bmad-output` directory (relative to project root) |
| `spec_prefix` | No | `"bm"` | Prefix for spec IDs (e.g., `bm-prd`) |
| `epic_prefix` | No | `"bme"` | Prefix for epic IDs (e.g., `bme-1`) |
| `story_prefix` | No | `"bms"` | Prefix for story IDs (e.g., `bms-1-3`) |
| `import_project_context` | No | `true` | Import `project-context.md` as a spec |
| `sync_sprint_status` | No | `true` | Sync status from `sprint-status.yaml` |

#### Beads (`"beads"`)

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `path` | Yes | — | Path to `.beads` directory |
| `issue_prefix` | No | auto | Prefix for issue IDs |

#### OpenSpec (`"openspec"`)

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `path` | Yes | `".openspec"` | Path to OpenSpec directory |
| `spec_prefix` | No | `"os"` | Prefix for spec IDs |
| `issue_prefix` | No | `"osi"` | Prefix for issue IDs |

#### Spec-Kit (`"speckit"`)

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `path` | Yes | — | Path to `.specify` directory |
| `spec_prefix` | No | `"sk"` | Prefix for spec IDs |
| `task_prefix` | No | `"skt"` | Prefix for task IDs |
| `include_supporting_docs` | No | `true` | Include reference documents |
| `include_constitution` | No | `true` | Include contract documents |

#### GitHub (`"github"`)

No `options` required. Uses `gh` CLI for authentication. Import-only (no watch/push).

### Example: Full Multi-Provider Config

```json
{
  "sourceOfTruth": "jsonl",
  "integrations": {
    "bmad": {
      "enabled": true,
      "auto_sync": true,
      "default_sync_direction": "bidirectional",
      "conflict_resolution": "newest-wins",
      "options": {
        "path": "_bmad-output",
        "sync_sprint_status": true
      }
    },
    "github": {
      "enabled": true,
      "auto_import": false
    },
    "openspec": {
      "enabled": false,
      "options": {
        "path": ".openspec"
      }
    }
  }
}
```

### CLI Plugin Management

```bash
sudocode plugin list              # Show all plugins and their status
sudocode plugin list --all        # Include uninstalled first-party plugins
sudocode plugin status            # Show sync status for active plugins
sudocode plugin configure bmad --enable --set path=_bmad-output
sudocode plugin test bmad         # Verify connectivity
sudocode plugin info bmad         # Show plugin details and config schema
```

### Server API for Plugins

```
GET  /api/plugins                          # List plugins with status
GET  /api/plugins/:name/config-schema      # Get config schema (for UI forms)
POST /api/plugins/:name/configure          # Update config
POST /api/plugins/:name/activate           # Enable plugin
POST /api/plugins/:name/deactivate         # Disable plugin
```

---

## 5 Integration Plugins

### BMAD (integration-bmad)

**Capabilities:** watch + poll + push

| Property | Value |
|----------|-------|
| `supportsWatch` | `true` |
| `supportsPolling` | `true` |
| `supportsOnDemandImport` | `false` |
| `supportsSearch` | `false` |
| `supportsPush` | `true` |

**Entity mapping:** BMAD artifacts (PRD, architecture, stories, epics) -> specs/issues

**9 BMAD Personas:**

| Persona | Key | Role |
|---------|-----|------|
| Larry | `analyst` | Business Analyst |
| Olivia | `owner` | Product Owner |
| Percy | `pm` | Project Manager |
| Sam | `architect` | Solutions Architect |
| Amelia | `dev` | Developer |
| Quinn | `qa` | QA Specialist |
| Bobby | `devops` | DevOps Engineer |
| Dana | `design` | UX Designer |
| Barry | `quick-flow` | Solo Developer (quick-flow mode) |

**Key files:**
- `plugin.ts` -- IntegrationPlugin + IntegrationProvider implementation
- `watcher.ts` -- chokidar-based file watcher for `_bmad-output/`
- `parsers/` -- Artifact, epic, and story parsers (YAML/markdown)
- `writer/` -- Sprint writer (writes back to BMAD files)
- `entity-mapper.ts` -- BMAD -> sudocode entity mapping
- `persona-prompts.ts` -- 9 persona system prompts
- `id-generator.ts` -- BMAD-specific ID generation

### Beads (integration-beads)

**Capabilities:** watch + poll + push

| Property | Value |
|----------|-------|
| `supportsWatch` | `true` |
| `supportsPolling` | `true` |
| `supportsOnDemandImport` | `false` |
| `supportsSearch` | `false` |
| `supportsPush` | `true` |

**Format:** JSONL-based. Simplest plugin implementation -- serves as a reference for other plugins.

### GitHub (integration-github)

**Capabilities:** on-demand import only

| Property | Value |
|----------|-------|
| `supportsWatch` | `false` |
| `supportsPolling` | `false` |
| `supportsOnDemandImport` | `true` |
| `supportsSearch` | `true` |
| `supportsPush` | `false` |

**Entity mapping:** GitHub Issues -> sudocode Issues. Supports URL-based import, search, and comment fetching. Implements `OnDemandImportCapable` interface.

### OpenSpec (integration-openspec)

**Capabilities:** watch + poll + push

| Property | Value |
|----------|-------|
| `supportsWatch` | `true` |
| `supportsPolling` | `true` |
| `supportsOnDemandImport` | `false` |
| `supportsSearch` | `false` |
| `supportsPush` | `true` |

**Format:** File-based. Multi-entity plugin with relationship support.

### Spec-Kit (integration-speckit)

**Capabilities:** watch + poll + push

| Property | Value |
|----------|-------|
| `supportsWatch` | `true` |
| `supportsPolling` | `true` |
| `supportsOnDemandImport` | `false` |
| `supportsSearch` | `false` |
| `supportsPush` | `true` |

**Format:** File-based. Includes `relationship-mapper.ts` for cross-entity relationship mapping.

## BMAD Integration Layers

The BMAD integration spans all layers of the stack:

```
Layer 1: Plugin
  plugins/integration-bmad/
    ├── parsers (artifact, epic, story)
    ├── watcher (chokidar on _bmad-output/)
    ├── writer (sprint-writer)
    └── persona-prompts (9 personas)
           │
           │ IntegrationProvider interface
           v
Layer 2: Server Routes
  server/src/routes/bmad.ts
    ├── GET  /api/bmad/status    (pipeline status, current phase)
    ├── GET  /api/bmad/personas  (persona list with status)
    ├── POST /api/bmad/execute   (run persona on issue)
    └── services/bmad-execution-service.ts
           │
           │ REST API
           v
Layer 3: MCP Tools
  mcp/src/tool-registry.ts
    ├── bmad_status    (get pipeline status)
    ├── bmad_next_step (compute next recommended step)
    └── bmad_run_skill (execute persona skill)
           │
           │ HTTP to server
           v
Layer 4: Frontend
  frontend/src/
    ├── pages/BmadDashboardPage.tsx  (persona grid, phase overview)
    ├── pages/BmadPipelinePage.tsx   (DAG with phase/gate nodes)
    ├── pages/BmadSprintPage.tsx     (sprint board for stories)
    ├── components/bmad/ (17 components)
    └── hooks/useBmadPipeline.ts, useBmadPersonas.ts
```

## Data Flow

### External System -> sudocode (Inbound Sync)

```
External System (e.g., BMAD _bmad-output/, GitHub API)
       │
       v
  Plugin Provider (watcher callback / getChangesSince / fetchByUrl)
       │
       ├── ExternalChange { entity_id, entity_type, change_type, data }
       │
       v
  SyncCoordinator
       │
       ├── mapToSudocode() — normalize to Partial<Spec> or Partial<Issue>
       ├── Conflict resolution (newest-wins / sudocode-wins / external-wins / manual)
       ├── Set external_link on entity
       │
       v
  CLI operations (createSpec / updateSpec / createIssue / updateIssue)
       │
       ├── Write to SQLite cache
       ├── Export to JSONL (atomic write: temp file + rename)
       ├── Generate/update markdown file
       │
       v
  WebSocket broadcast
       │
       v
  Frontend (React Query cache invalidation -> UI update)
```

### sudocode -> External System (Outbound Push)

```
CLI/Server entity update
       │
       ├── Check entity.external_links for sync_enabled providers
       │
       v
  SyncCoordinator
       │
       ├── mapFromSudocode() — convert to ExternalEntity
       │
       v
  Plugin Provider (updateEntity / createEntity)
       │
       v
  External System updated
```

### Creating an Execution

```
Frontend                    Server                      Git/Agent
   │                          │                            │
   ├─ POST /api/issues/:id/  ─┤                            │
   │  executions              │                            │
   │                          ├─ Create git worktree ──────┤
   │                          ├─ Spawn agent process ──────┤
   │                          │  (via ACP adapter)         │
   │                          │                            │
   │ <── WebSocket: status ───┤                            │
   │ <── WebSocket: logs ─────┤<── stdout/stderr ──────────┤
   │                          │                            │
   │                          ├─ Capture after_commit <────┤
   │ <── WebSocket: complete ─┤                            │
   │                          │                            │
   ├─ GET /api/executions/   ─┤                            │
   │  :id/changes             ├─ git diff (before..after) ─┤
   │ <── File change stats ───┤                            │
```

### Entity Sync (Markdown <-> JSONL <-> SQLite)

```
User edits .md file
       │
       v
  chokidar watcher (cli/src/watcher.ts)
       │
       ├─ Parse frontmatter (gray-matter)
       ├─ Extract cross-references ([[s-xxxx]])
       ├─ Update SQLite cache
       ├─ Export to JSONL (atomic write)
       │
       v
  WebSocket broadcast (server)
       │
       v
  Frontend invalidates React Query cache
       │
       v
  UI updates in real-time
```

## Shared Dependencies

| Dependency | Used By | Purpose |
|-----------|---------|---------|
| `@sudocode-ai/types` | all packages | Type definitions, schema, migrations |
| `better-sqlite3` | cli, server | SQLite database |
| `chokidar` | cli, plugins | File watching |
| `zod` | server, frontend | Schema validation |
| `vitest` | all packages | Testing |
| `typescript` | all packages | Compilation |
| `agent-execution-engine` | server | Agent process management via ACP |
| `@modelcontextprotocol/sdk` | mcp, server | MCP protocol |
| `gray-matter` | cli | Markdown frontmatter parsing |
| `commander` | cli | CLI framework |

## Multi-Project Support

The server supports managing multiple sudocode projects simultaneously:

- `ProjectRegistry` tracks active projects
- `ProjectManager` handles project switching
- `project-context` middleware injects project context per request via `X-Project-ID` header
- WebSocket messages include project identification for client-side filtering
- Frontend uses `ProjectContext` to scope all operations

## Known Integration Issues

From the `review/` directory (5 review reports compiled into `00-master-fix-list.md`):

### Critical (5 issues -- must fix before ship)

| ID | Issue | Location |
|----|-------|----------|
| C1 | Missing `validate()` method on BmadProvider -- sync-coordinator crashes at startup | `plugins/integration-bmad/src/plugin.ts` |
| C2 | `runBmadSkill()` routes to wrong endpoint (`POST /api/issues/:id/executions` instead of `POST /api/bmad/execute`) -- persona prompt injection never happens | `mcp/src/api-client.ts` |
| C3 | Duplicate axios instances in frontend BMAD hooks -- misses auth interceptors, error handling, and `X-Project-ID` header | `frontend/src/hooks/useBmadPipeline.ts`, `useBmadPersonas.ts` |
| C4 | Persona key mismatch: server uses `quick-flow-solo-dev`, plugin uses `quick-flow` -- Barry's persona 400s | `server/src/routes/bmad.ts` vs `plugins/integration-bmad/src/persona-prompts.ts` |
| C5 | Watcher never emits `change_type: "created"` -- new BMAD artifacts won't auto-import because sync-coordinator only auto-imports on `"created"` | `plugins/integration-bmad/src/watcher.ts` |

### Important (10 issues -- should fix)

| ID | Issue | Summary |
|----|-------|---------|
| I1 | `searchEntities()` missing `query` parameter | Interface compliance |
| I2 | Sprint writer destroys YAML formatting | `yaml.dump()` strips comments |
| I3 | Watcher doesn't populate `data` field in ExternalChange | Sync can't auto-import |
| I4 | Dev persona name: "Amos" vs "Amelia" | Name mismatch in server route |
| I5 | Duplicate persona data in server routes | `BMAD_AGENTS` not imported from plugin |
| I6 | `computeNextStep` assigns architecture to wrong phase | Should be solutioning, not planning |
| I7 | No WebSocket integration in BMAD hooks | UI stale until 30s poll |
| I8 | `bmad_run_skill` optional `issue_id` vs required `issueId` | MCP/server parameter mismatch |
| I9 | Raw SQL bypass in execution service | Should use `updateExecution()` |
| I10 | Missing sprint components in barrel exports | 4 components not exported |

### Minor (12+ issues)

Version drift, duplicated helpers, performance issues, missing type detection, `any` typing, missing click handlers, unnecessary project context requirements, SQL injection risk, missing pre-validation, undocumented anti-oscillation logic, inconsistent error format, extra return fields.

### Fix Priority Order

1. C1 (validate) + C5 (watcher created) -- Plugin won't initialize
2. C2 (MCP endpoint) + C4 (persona keys) -- Core functionality broken
3. C3 (axios) + I4/I5 (persona drift) -- Infrastructure consistency
4. I1-I3 (interface compliance, sync correctness)
5. I6-I10 (phase mapping, WebSocket, exports)
6. M1-M12 (polish)
