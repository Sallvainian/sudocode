# Architecture

> Generated: 2026-03-22 | Version: 0.2.0 | Type: TypeScript Monorepo (npm workspaces)

## Executive Summary

sudocode is a git-native context management system for AI-assisted software development. It treats context as code -- git-tracked, distributed, and mergeable -- by organizing AI coding work into a 4-tier abstraction: Spec (what), Issue (tasks), Execution (how), and Artifact (results). The system is built as a TypeScript monorepo with 5 packages spanning shared types, a CLI, an MCP server, a local backend, and a React frontend.

---

## System Architecture

```
                         ┌──────────────────────────────────────────────────────┐
                         │               Frontend (React 18 SPA)               │
                         │                                                      │
                         │  Pages: Executions, Issues, Specs, Workflows,        │
                         │         Worktrees, Archived Issues                   │
                         │  Stack: Vite + TailwindCSS + shadcn/ui (Radix)       │
                         │         TanStack React Query + WebSocket             │
                         │         Tiptap, React Flow + dagre, @dnd-kit         │
                         │  Themes: 9 color themes (light/dark variants)        │
                         └──────────────────────┬───────────────────────────────┘
                                                │
                                    REST API + WebSocket (30+ event types)
                                    X-Project-ID header routing
                                                │
┌───────────────────────────────────────────────┴───────────────────────────────┐
│                          Server (Express + ws)                                │
│                                                                               │
│  Routes: /api/executions, /api/issues, /api/specs, /api/workflows,            │
│          /api/relationships, /api/feedback, /api/agents, /api/worktrees        │
│  Services: execution-service, agent-registry, worktree-sync,                  │
│            execution-changes-service                                          │
│  Execution Engine: ACP adapters (6 agents), worker pool, worktree isolation   │
│  Workflow Engine: SequentialWorkflowEngine, OrchestratorWorkflowEngine         │
│  Multi-Project: ProjectRegistry + ProjectManager + ProjectContext              │
└─────────────┬──────────────────────────────────┬──────────────────────────────┘
              │ imports                          │ child_process (subprocess)
┌─────────────┴────────────┐     ┌──────────────┴───────────────────────────────┐
│     CLI (Commander)       │     │           MCP Server (stdio)                 │
│                           │     │                                              │
│  Operations: CRUD         │     │  53 tools across 11 scopes                  │
│  Storage: JSONL + SQLite  │     │  Scopes: default, overview, executions,     │
│  Sync: watcher (fs)       │     │    inspection, workflows, voice, bmad       │
│  Merge: git custom driver │     │  Meta-scopes: project-assistant, all        │
│  Plugins: 5 integrations  │     │  Dual routing: CLI (subprocess) + API (HTTP)│
│  Config: project + local  │     │  Wraps CLI via child_process                │
└─────────────┬────────────┘     └──────────────────────────────────────────────┘
              │ imports
┌─────────────┴────────────┐
│    Types (definitions)    │
│                           │
│  Entities: Spec, Issue,   │
│    Execution, Feedback    │
│  Schema: SQLite DDL       │
│  Migrations: versioned    │
│  Agents: 6 agent configs  │
│  Artifacts: change types  │
│  Workflows: orchestration │
└───────────────────────────┘
```

### Package Dependency Graph

```
types          (standalone, no dependencies)
  ^
  |
cli            (depends on types -- CRUD, sync, merge, plugins)
  ^       ^
  |       |
server    mcp  (server depends on cli; mcp wraps cli via child_process)

frontend       (independent -- talks to server via REST/WebSocket)
```

### Package Responsibilities

| Package | npm Name | Purpose |
|---------|----------|---------|
| `types/` | `@sudocode-ai/types` | Shared TypeScript definitions, SQLite schema, migrations |
| `cli/` | `@sudocode-ai/cli` | Core operations, storage, sync, merge drivers, plugins |
| `mcp/` | `@sudocode-ai/mcp` | MCP server exposing 53 tools via stdio transport |
| `server/` | `@sudocode-ai/local-server` | REST API, WebSocket, execution engine, workflow engine |
| `frontend/` | `@sudocode-ai/local-ui` | React SPA for web-based interaction |
| `sudocode/` | (meta-package) | Bundles all packages together |

---

## 4-Tier Abstraction Model

```
┌─────────────────────────────────────────┐
│  Tier 1: SPEC (s-xxxx)                 │
│  User intent and requirements (WHAT)    │
│  "Build a login page with OAuth"        │
├─────────────────────────────────────────┤
│  Tier 2: ISSUE (i-xxxx)                │
│  Agent-scoped work items                │
│  "Implement Google OAuth adapter"       │
├─────────────────────────────────────────┤
│  Tier 3: EXECUTION                      │
│  Agent run trajectory (HOW)             │
│  claude-code session on issue i-a1b2    │
├─────────────────────────────────────────┤
│  Tier 4: ARTIFACT                       │
│  Code diffs and output (Results)        │
│  3 files changed, 2 commits, tests pass │
└─────────────────────────────────────────┘
```

### Entity Details

| Entity | ID Format | Storage | Status Lifecycle |
|--------|-----------|---------|------------------|
| Spec | `s-xxxx` | JSONL + Markdown + SQLite | (no status) |
| Issue | `i-xxxx` | JSONL + Markdown + SQLite | open -> in_progress -> blocked/needs_review -> closed |
| Execution | UUID | SQLite | preparing -> pending -> running -> paused/completed/failed/cancelled/stopped |
| Artifact | (embedded) | Git diffs, execution logs | (derived from execution) |

### ID Generation

- **Hash-based IDs**: Generated from `${entityType}-${title}-${timestamp}`, hashed to base36.
- **Adaptive length**: 4-8 characters based on entity count to minimize collisions.
- **Dual identity**: Every entity has both `id` (hash, user-facing) and `uuid` (UUID v4, distributed sync/dedup).
- **Git-merge friendly**: Short hashes reduce conflict surface in concurrent branches.

---

## Storage Architecture

### Three-Layer Distributed Git Database

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Markdown Files                            │
│  .sudocode/specs/*.md, .sudocode/issues/*.md        │
│  Human-editable, frontmatter + content              │
│  Git-tracked                                        │
├────────────────────────┬────────────────────────────┤
│                    syncs via watcher                 │
├────────────────────────┴────────────────────────────┤
│  Layer 2: JSONL Files                               │
│  .sudocode/specs.jsonl, .sudocode/issues.jsonl      │
│  One JSON object per line, sorted by created_at     │
│  Git-tracked -- DEFAULT source of truth             │
├────────────────────────┬────────────────────────────┤
│                  import / export                    │
├────────────────────────┴────────────────────────────┤
│  Layer 3: SQLite Cache                              │
│  .sudocode/cache.db                                 │
│  Query engine with indexes and views                │
│  Gitignored -- rebuilt from JSONL on demand         │
└─────────────────────────────────────────────────────┘
```

### Source of Truth Configuration

Configured in `.sudocode/config.json`:

| Mode | Authoritative | Derived | Use Case |
|------|--------------|---------|----------|
| `"jsonl"` (default) | JSONL files | Markdown is generated | Programmatic workflows, CI |
| `"markdown"` | Markdown files | JSONL is generated | Human-first editing |

Regardless of mode, JSONL is always exported for git tracking.

### Sync Flows

```
User edits .md  -->  watcher detects  -->  parse frontmatter  -->  update JSONL  -->  update SQLite
CLI updates DB  -->  debounced export  -->  update JSONL  -->  update .md
Git pull        -->  JSONL changed     -->  import  -->  rebuild SQLite
```

### Write Guarantees

- **Atomic writes**: All JSONL writes go through temp file + rename to prevent corruption.
- **Sort order**: Entries sorted by `created_at` timestamp to minimize git merge conflicts.
- **File mtime**: Set to newest `updated_at` for efficient change detection.
- **Content hashing**: SHA256 hashing for integration sync change detection.

### Storage Layout

```
.sudocode/
├── specs/              # Markdown files (git-tracked)
├── issues/             # Markdown files (git-tracked)
├── specs.jsonl         # Spec data (git-tracked)
├── issues.jsonl        # Issue data (git-tracked)
├── config.json         # Project config (git-tracked)
├── config.local.json   # Local/machine config (gitignored)
├── cache.db            # SQLite cache (gitignored)
└── worktrees/          # Execution worktrees (gitignored)
```

---

## Database Schema

### Tables (11)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `specs` | Spec metadata and content | id, uuid, title, content, parent_id, external_links (JSON) |
| `issues` | Issue metadata, status, assignee | id, uuid, title, status, parent_id, external_links (JSON) |
| `relationships` | Polymorphic entity graph edges | from_id, to_id, type |
| `issue_feedback` | Anchored feedback from_id -> to_id | from_id, to_id, feedback_type, location_anchor (JSON), status |
| `tags` | Entity tagging | entity_id, tag |
| `events` | Audit log | entity_id, event_type, timestamp |
| `executions` | Execution lifecycle | issue_id, agent_type, status, mode, worktree_path, before_commit, after_commit, parent_execution_id, workflow_execution_id, step_type, step_index, step_config |
| `execution_logs` | Agent output | execution_id, raw_logs (JSONL), normalized_entry (NDJSON) |
| `prompt_templates` | Reusable execution prompts | type (issue/spec/custom), content |
| `workflows` | Workflow config and status | source, steps (JSON), status |
| `workflow_events` | Step lifecycle events | workflow_id, step_index, event_type |

### Views

| View | Purpose |
|------|---------|
| `ready_issues` | Issues with no blocking relationships |
| `blocked_issues` | Issues that have unresolved blockers |

### Relationship Types

```
blocks  |  implements  |  depends-on  |  references  |  discovered-from  |  related
```

Relationships are polymorphic: spec-to-spec, issue-to-issue, issue-to-spec, and any combination.

### Feedback Anchoring

Issue feedback uses location anchors to attach comments to specific locations in specs or other issues:

- **Anchor data**: line number, section heading, text snippet, context (3 lines before/after)
- **Auto-relocation** when the target document changes:
  1. Try exact line match
  2. Try text snippet match
  3. Try section heading match
  4. Mark as `stale` if all fail
- **Status**: `valid` | `relocated` | `stale`
- **Polymorphic**: `from_id` (issue) -> `to_id` (spec or issue)

### SQLite Pragmas

```sql
PRAGMA journal_mode = WAL;      -- Write-Ahead Logging for concurrent reads
PRAGMA foreign_keys = ON;       -- Enforce referential integrity
PRAGMA mmap_size = 30000000000; -- 30GB memory-mapped I/O
```

### Key Indexes

```
idx_executions_issue          (issue_id)
idx_executions_status         (status)
idx_executions_workflow       (workflow_execution_id)
idx_executions_workflow_step  (workflow_execution_id, step_index)
idx_feedback_from             (from_id)
idx_feedback_to               (to_id)
```

---

## Cross-References

Markdown files support wiki-style cross-references that create bidirectional relationships:

```markdown
[[s-abc123]]              # Spec reference
[[@i-xyz]]               # Issue reference
[[s-abc123|Display]]     # With display text
[[i-xyz]]{ blocks }      # With relationship type
```

These are extracted via regex and automatically create entries in the `relationships` table.

---

## Execution Architecture

### Lifecycle

```
1. User creates execution (via UI or API)
   |
   v
2. Server creates git worktree (isolated branch: sudocode/exec-{id})
   |
   v
3. Agent adapter spawns agent process (ACP or legacy shim)
   |
   v
4. Real-time log streaming via WebSocket (NDJSON)
   |
   v
5. Agent completes --> capture after_commit
   |
   v
6. User syncs changes back (preview / squash / preserve / stage)
```

### Agent Types (6)

| Agent | Type Key | Protocol | Config Highlights |
|-------|----------|----------|-------------------|
| Claude Code | `claude-code` | Native ACP | model, systemPrompt, allowedTools, mcpServers, permissions |
| Codex | `codex` | Native ACP | model, fullAuto, sandbox |
| Copilot | `copilot` | ACP via shim | model |
| Cursor | `cursor` | ACP via shim | model, forceMode |
| Gemini | `gemini` | Native ACP | model |
| OpenCode | `opencode` | Native ACP | model |

All agents are integrated via the Agent Client Protocol (ACP):
- **Native ACP**: claude-code, codex, gemini, opencode -- direct protocol support.
- **ACP via shim**: copilot, cursor -- wrapped with a compatibility layer.
- The agent registry discovers and verifies executables with a 24-hour cache.
- Each adapter normalizes agent output into a standardized `NormalizedEntry` format.

### Worktree Isolation

Each execution gets an isolated git worktree to prevent conflicts between concurrent agent runs:

- **Branch naming**: `sudocode/exec-{id}`
- **Parallel execution**: Multiple agents can work simultaneously without interference.
- **Auto-cleanup**: Worktrees are cleaned up on completion (configurable).
- **Orphan cleanup**: Server startup detects and removes orphaned worktrees.
- **Sparse checkout**: Optional for large repositories (configured in `config.local.json`).

### Execution Chains

Executions can be chained together for iterative work:

```
Root Execution (e-001)
  |
  +-- Follow-up (e-002, parent_execution_id = e-001)
        |
        +-- Follow-up (e-003, parent_execution_id = e-002)
```

- Follow-ups share the same worktree as the root (continue from the same state).
- Change calculation traverses the chain to find the root `before_commit`.
- The `/api/executions/:id/chain` endpoint retrieves the full chain.

### Sync Modes (4)

| Mode | Behavior | Use Case |
|------|----------|----------|
| Preview | Non-destructive diff and conflict analysis | Review before merging |
| Squash | Combine all worktree commits into one on target branch | Clean history |
| Preserve | Merge with full commit history | Audit trail |
| Stage | Apply changes to working directory without committing | Manual review |

Additional sync features:
- JSONL conflict auto-resolution via three-way merge.
- Safety snapshots via git tags for rollback.
- Uncommitted change tracking and optional inclusion.
- Handles deleted worktrees gracefully.

---

## Workflow Orchestration

### Sequential Engine

Server-managed step execution following dependency order:
- Topological sort of issue dependency graph.
- One step at a time (or configurable concurrency).
- Auto-commit after each step.

### Orchestrator Engine

AI agent orchestrates workflow dynamically:
- Orchestrator agent gets MCP tools for workflow management.
- Spawns MCP subprocess for agent interaction.
- Event-driven wakeup system (batched events).
- Autonomy levels: `full_auto` or `human_in_the_loop`.
- Escalation system for human-in-the-loop decisions.

### Workflow Sources

Workflows can be created from: `spec`, `issues`, `root_issue`, or `goal`.

---

## MCP Server Architecture

The MCP server exposes 53 tools organized into 11 scopes:

| Scope | Examples |
|-------|---------|
| `default` | ready, list_issues, show_spec, upsert_issue, link |
| `overview` | Project status and summary tools |
| `executions` | Start, stop, follow-up, stream executions |
| `inspection` | Deep inspection of execution state |
| `workflows` | Create, manage, monitor workflows |
| `voice` | STT/TTS, narration |
| `bmad` | BMAD persona and methodology tools |

Meta-scopes `project-assistant` and `all` aggregate tools across multiple scopes.

### Dual Routing

Tools route to their backends in two ways:
- **CLI tools**: Executed as subprocess calls to the CLI package.
- **API tools**: Make HTTP requests to the local server for execution/workflow operations.

---

## Integration Plugin System

### Architecture

```
IntegrationPlugin (factory)
  |
  +-- validateConfig()
  +-- testConnection()
  +-- createProvider() --> IntegrationProvider (runtime)
                              |
                              +-- Entity CRUD in external system
                              +-- Change detection (watch / polling / on-demand)
                              +-- Field mapping (external <-> sudocode)
                              +-- Content hashing (SHA256)
```

`SyncCoordinator` orchestrates bidirectional sync across providers.

### Plugins (5)

| Plugin | External System | Capabilities |
|--------|----------------|--------------|
| BMAD | BMAD methodology | Persona execution, quality gates, parsing, bidirectional status sync |
| Beads | Beads | File watching, sync |
| GitHub | GitHub Issues/PRs | Import, sync, search via `gh` CLI |
| OpenSpec | OpenSpec | File watching, sync |
| Spec-Kit | SpecKit | File watching, sync |

### Provider Capabilities

| Capability | Description |
|------------|-------------|
| `watch` | Real-time file system watching for changes |
| `polling` | Periodic polling for external changes |
| `on-demand` | Import via URL or explicit trigger |
| `search` | Search external system for entities |
| `push` | Push sudocode changes to external system |

---

## BMAD Integration

The BMAD (Business Method for AI-assisted Development) integration is a first-party plugin that connects the BMAD 4-phase methodology to sudocode's entity model. It spans all layers: plugin, server, MCP, and frontend.

### 4-Phase Methodology

```
Phase 1: Discovery ──→ Phase 2: Planning ──→ Phase 3: Preparation ──→ Phase 4: Execution
  brainstorming           PRD creation          epics & stories         sprint planning
  domain research         UX design             readiness check         story cycle (repeat)
  product brief           architecture                                  retrospective
```

- Phases 1-3 use the **sequential** workflow engine
- Phase 4 uses the **orchestrator** engine (AI-managed story iteration)

### Artifact-to-Entity Mapping

BMAD artifacts in `_bmad-output/` map to sudocode entities:

| BMAD Artifact | Location | sudocode Entity | ID Example |
|---------------|----------|-----------------|------------|
| PRD | `planning-artifacts/PRD.md` | Spec | `bm-prd` |
| Architecture | `planning-artifacts/architecture.md` | Spec | `bm-arch` |
| UX Spec | `planning-artifacts/ux-spec.md` | Spec | `bm-ux` |
| Product Brief | `planning-artifacts/product-brief.md` | Spec | `bm-brief` |
| Project Context | `project-context.md` | Spec | `bm-ctx` |
| Epic | `planning-artifacts/epics/epic-N.md` | Issue (parent) | `bme-1` |
| Story | `implementation-artifacts/story-N-M-*.md` | Issue (child) | `bms-1-3` |

**Relationships created automatically:**
- Architecture/UX-Spec **references** PRD (spec→spec)
- Epics **implement** PRD (issue→spec)
- Stories **implement** their Epic (issue→issue)
- Story dependencies expressed as **depends-on** relationships

### Persona System

Each persona has a dedicated system prompt injected via `appendSystemPrompt` in the Claude Code config. The prompt includes identity, communication style, core principles, and available skills.

| Key | Name | Role | Phase | Skills |
|-----|------|------|-------|--------|
| `analyst` | Mary | Strategic Business Analyst | Discovery | brainstorming, domain research, market research |
| `pm` | John | Product Manager | Planning | PRD creation, validation, requirements |
| `architect` | Winston | System Architect | Planning | architecture design, technical decisions |
| `ux-designer` | Sally | UX Designer | Planning | UX design, UI specifications |
| `sm` | Bob | Scrum Master | Preparation/Execution | epics, stories, sprint planning |
| `dev` | Amelia | Senior Developer | Execution | story implementation, code review |
| `qa` | Quinn | QA Engineer | Execution | test generation, validation |
| `quick-flow` | Barry | Full-Stack Developer | Any | rapid prototyping, solo dev |
| `tech-writer` | Paige | Technical Writer | Any | documentation, knowledge curation |

**Execution flow:**
1. MCP tool `bmad_run_skill` sends `{ persona, skill, issueId }` to server
2. Server calls `POST /api/bmad/execute` (not generic execution endpoint)
3. `BmadExecutionService.createBmadExecution()` looks up persona in `BMAD_PERSONAS`
4. `getPersonaConfig(persona)` returns `{ appendSystemPrompt: "..." }`
5. Execution starts with persona identity injected into agent system prompt

### Quality Gates

Quality gates validate work at phase transitions. Results create feedback and blocking relationships.

| Gate Type | Purpose | Triggered At |
|-----------|---------|-------------|
| `readiness` | Validates stories are ready for implementation | Phase 3 → Phase 4 |
| `story-validation` | Validates story completeness and acceptance criteria | During sprint |
| `code-review` | Validates code quality and standards adherence | After dev-story |

**Gate results and actions:**

| Result | Feedback Type | Blocking | Action |
|--------|--------------|----------|--------|
| `pass` | `comment` | No | Creates informational feedback |
| `concerns` | `suggestion` | No | Creates suggestion-type feedback items |
| `fail` | `request` | Yes | Creates request feedback, adds `blocks` relationship, sets issue to `blocked` |

Gate resolution (`POST /api/bmad/gate/resolve`) dismisses feedback and removes blocking relationships.

### Parsers

| Parser | File | Handles |
|--------|------|---------|
| `artifact-parser.ts` | Generic | PRD, architecture, UX spec, product brief, project context |
| `epic-parser.ts` | Specialized | Sharded (`epic-N.md`) and combined (`epics.md`) formats |
| `story-parser.ts` | Specialized | `story-N-M-*.md` with acceptance criteria and tasks |
| `sprint-parser.ts` | Specialized | `sprint-status.yaml` with status aliases |

### Writers (Bidirectional Sync)

- **sprint-writer.ts**: Updates `sprint-status.yaml` when story/epic status changes in sudocode
- **story-writer.ts**: Updates story markdown Status field and task completion checkboxes

### Watcher

`BmadWatcher` monitors `_bmad-output/` using chokidar with:
- SHA-256 content hashing to detect actual changes (vs file touches)
- Debounced batch notifications (150ms default)
- Anti-echo: updates hash cache after writes to prevent feedback loops
- Watch paths: `planning-artifacts/**/*.md`, `implementation-artifacts/**/*.md`, `sprint-status.yaml`, `project-context.md`

### BMAD Server Routes

```
GET  /api/bmad/status     # Phase detection based on artifact state
GET  /api/bmad/agents     # List 9 persona definitions
GET  /api/bmad/artifacts  # Scan _bmad-output/ for artifact files
POST /api/bmad/import     # Trigger BMAD plugin sync
POST /api/bmad/workflow   # Generate 4-phase workflow template
POST /api/bmad/gate       # Apply quality gate result
POST /api/bmad/gate/resolve # Resolve gate (dismiss feedback, unblock)
POST /api/bmad/execute    # Execute with persona system prompt injection
```

### BMAD MCP Tools

| Tool | Scope | Purpose |
|------|-------|---------|
| `bmad_status` | bmad | Current phase, artifact completion, progress |
| `bmad_next_step` | bmad | Next recommended step based on artifact state |
| `bmad_run_skill` | bmad | Execute skill with auto-persona selection |

`bmad_next_step` uses `computeNextStep()` which checks artifact existence in order: product-brief → PRD → architecture → UX spec → epics → stories → default to dev.

### BMAD Frontend

| Page | Route | Purpose |
|------|-------|---------|
| `BmadDashboardPage` | `/bmad` | Phase tracker, artifact checklist, active persona, next step |
| `BmadPipelinePage` | `/bmad/pipeline` | DAG visualization of 4-phase pipeline (React Flow + dagre) |
| `BmadSprintPage` | `/bmad/sprint` | Kanban board for stories with epic filtering |

18 BMAD-specific components including: `BmadPhaseTracker`, `BmadArtifactChecklist`, `BmadActiveAgentPanel`, `BmadNextStepPanel`, `BmadPipelineDAG`, `BmadSprintBoard`, `BmadStoryCard`, `BmadGateOverview`, `BmadPersonaGrid`.

---

## Frontend Architecture

### Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: TailwindCSS with shadcn/ui (Radix primitives)
- **Data fetching**: TanStack React Query (30s stale time, 1h cache)
- **Real-time**: WebSocket with project-scoped subscriptions
- **Rich text**: Tiptap with entity mentions
- **Visualization**: React Flow + dagre for DAG rendering
- **Drag-and-drop**: @dnd-kit
- **Diff rendering**: @git-diff-view/react
- **Themes**: 9 color themes with light/dark variants

### Pages

| Page | Purpose |
|------|---------|
| ExecutionsPage | Multi-execution grid view with filtering and pagination |
| ExecutionDetailPage | Execution chain view with follow-ups inline |
| WorktreesPage | Worktree management with sync dialogs |
| IssuesPage | Issue list and detail views |
| SpecsPage | Spec list and detail views |
| ArchivedIssuesPage | View archived issues with feedback |

### Key Components

**Execution Management**: ExecutionChainTile, ExecutionsGrid, ExecutionsSidebar, ExecutionView, ExecutionMonitor, FollowUpDialog, AgentTrajectory

**Code Changes**: CodeChangesPanel (file list with A/M/D/R stats), DiffViewer (unified diff), CommitChangesDialog, SyncPreviewDialog

**Agent Configuration**: AgentConfigPanel, AgentSelector, per-agent config forms (ClaudeCodeConfigForm, CodexConfigForm, etc.)

**Worktree Management**: WorktreeList, WorktreeCard, WorktreeDetailPanel

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useExecutions` | Fetch root executions with React Query + WebSocket |
| `useExecutionChanges` | Get file changes (committed + uncommitted) |
| `useExecutionSync` | Manage sync operations (preview, squash, preserve, stage) |
| `useExecutionLogs` | Stream execution logs in real-time |
| `useAgUiStream` | Parse ag-ui output stream |
| `useAgents` | Fetch available agents |
| `useAgentActions` | Compute contextual actions based on execution state |
| `useWorktrees` | Fetch and manage worktrees |
| `useFeedback` | Feedback management |

### Routing

Project-scoped routing pattern: `/p/:projectId/...`

---

## Multi-Project Support

```
~/.sudocode/projects.json    <-- ProjectRegistry (persisted)
         |
    ProjectManager           <-- Manages open ProjectContext instances
         |
    ProjectContext            <-- Isolated DB, services, WebSocket subscriptions
```

- Each project gets its own database, services, and WebSocket subscriptions.
- `X-Project-ID` header routes API requests to the correct project context.
- Registry persists project metadata in `~/.sudocode/projects.json`.

---

## Real-Time Communication

### WebSocket Events (30+ types)

| Category | Events |
|----------|--------|
| Entity | issue/spec/feedback/relationship created/updated/deleted |
| Execution | created, updated, status_changed, voice_narration |
| Workflow | lifecycle events, step events |
| Session | pending, paused, ended |
| System | pong, error, subscribed |

### Project-Aware Messaging

WebSocket messages include project context, allowing the frontend to filter events by active project in multi-project mode.

---

## Voice Architecture

Optional STT/TTS support for voice-driven interaction:

| Component | Providers |
|-----------|-----------|
| STT (Speech-to-Text) | whisper-local (local server), OpenAI |
| TTS (Text-to-Speech) | browser (Web Speech API), Kokoro (local/WASM), OpenAI |

- **Streaming TTS**: WebSocket-based audio chunk streaming.
- **Narration**: Event-driven narration of execution progress.

---

## Configuration

### Project Config (`.sudocode/config.json`) -- Git-tracked

Shared project settings version controlled with the repository.

```json
{
  "sourceOfTruth": "jsonl"
}
```

### Local Config (`.sudocode/config.local.json`) -- Gitignored

Machine-specific settings that vary per developer.

```json
{
  "worktree": {
    "worktreeStoragePath": ".sudocode/worktrees",
    "autoCreateBranches": true,
    "autoDeleteBranches": false,
    "enableSparseCheckout": false,
    "branchPrefix": "sudocode",
    "cleanupOrphanedWorktreesOnStartup": true
  },
  "editor": {
    "editorType": "vs-code"
  }
}
```

### CLI Config Commands

```bash
sudocode config get [key]           # Show all config or specific key
sudocode config set <key> <value>   # Set config value
sudocode config show                # Show source of truth info
```

---

## Security Considerations

- **SQLite WAL mode** with `PRAGMA foreign_keys = ON` for data integrity.
- **Worktree isolation** provides process-level separation between concurrent executions.
- **restrictToWorkDir** option blocks file operations outside the working directory.
- **Credentials** managed via fnox (no hardcoded secrets in `.env` or source files).
- **Integration plugins** support configurable conflict resolution strategies.

---

## API Reference

### CLI Commands

```bash
sudocode init                            # Initialize .sudocode directory
sudocode spec create|list|show|update    # Spec management
sudocode issue create|list|show|update   # Issue management
sudocode link <from> <to> --type=<type>  # Create relationship
sudocode ready                           # Show ready work (no blockers)
sudocode sync [--watch]                  # Sync JSONL <-> SQLite
sudocode feedback add                    # Add anchored feedback
sudocode server start                    # Start local server
sudocode config get|set|show             # Configuration management
```

### Server API Endpoints

```
# Entity CRUD
GET/POST    /api/issues
GET/POST    /api/specs
GET/POST    /api/relationships
GET/POST    /api/feedback

# Execution Lifecycle
POST        /api/issues/:id/executions        # Start execution
GET         /api/executions/:id/chain          # Get execution chain
GET         /api/executions/:id/stream         # SSE stream
POST        /api/executions/:id/follow-up      # Create follow-up
POST        /api/executions/:id/stop           # Cancel execution

# Code Changes
GET         /api/executions/:id/changes        # File change stats
GET         /api/executions/:id/changes/file   # Individual file diff

# Worktree Sync
GET         /api/executions/:id/sync/preview   # Preview (conflicts, diff)
POST        /api/executions/:id/sync/squash    # Squash commits
POST        /api/executions/:id/sync/preserve  # Preserve history
POST        /api/executions/:id/sync/stage     # Stage without commit

# Other
GET         /api/agents                        # Available agents
WS          /ws                                # Real-time updates
```

---

## Known Issues

Issues identified in the `review/` directory, categorized by severity.

### Critical (5)

- Missing `validate()` implementation on BmadProvider
- MCP routes to wrong endpoint for certain operations
- Duplicate axios instance in frontend hooks
- Persona key mismatch between config and runtime
- Watcher never emits "created" events for new files

### Important (10)

- Missing query parameter in certain API calls
- YAML formatting loss during round-trip parsing
- Name mismatches between type definitions and runtime usage
- Missing WebSocket integration in some components
- Raw SQL bypass of the ORM layer in several queries

### Minor (12+)

- Version drift between package dependencies
- Duplicated helper utilities across packages
- `any` typing in several modules
- Missing exports from type definitions
